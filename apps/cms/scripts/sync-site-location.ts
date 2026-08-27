/**
 * Pushes the repo's canonical site location into the two Strapi records that
 * override it at runtime.
 *
 * Why this exists (#91): both location values are CMS-backed and the CMS wins.
 *
 *   site-setting.locationLine        -> the footer
 *   author(mehdi-zare).address*      -> Person JSON-LD on /, /contact,
 *                                       /consulting and /author/[slug]
 *
 * `seed.ts` would also fix them, but it is a full upsert: it rewrites
 * site-settings, the home/about/consulting pages, and every tag and category,
 * so any hand-edit made in the Strapi admin since the last seed is lost. This
 * sends exactly the four fields above and nothing else.
 *
 * *Sends* -- not "changes". `author` has Draft & Publish enabled, and Strapi 5's
 * REST update writes the payload onto the DRAFT; `?status=published` then
 * publishes the whole draft row, not just the fields in the payload. So an
 * unrelated, deliberately-unpublished admin edit would go live with the address
 * change. The script therefore reads the draft first and refuses to write when
 * it diverges from the published record outside the fields below (override with
 * `--allow-draft-publish`). `site-setting` has Draft & Publish disabled, so its
 * update has no such effect.
 *
 * The desired values come from `data/taxonomy.json` -- the same record the seed
 * writes -- so this script cannot disagree with the repo. `locationLine` is
 * derived as `${locality}, ${region}`, the composition
 * `apps/web/tests/site-identity-consistency.test.ts` (added in #98) pins.
 *
 * Usage (dry run -- prints the diff, writes nothing):
 *
 *   STRAPI_URL=https://cms.example.com STRAPI_API_TOKEN=<token> \
 *     npx tsx scripts/sync-site-location.ts
 *
 * Add `--apply` to write. Fields already correct are never sent.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Read at runtime rather than `import … from "…/taxonomy.json"`, matching
// seed.ts. `data/` sits outside this package, so a static import would make a
// file the CMS build context never copies into a compile-time dependency.
const taxonomy = JSON.parse(
  readFileSync(resolve(__dirname, "../../../data/taxonomy.json"), "utf-8")
) as { authors?: TaxonomyAuthor[] };

const STRAPI_URL = process.env.STRAPI_URL?.trim();
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN?.trim();
const APPLY = process.argv.includes("--apply");
const ALLOW_DRAFT_PUBLISH = process.argv.includes("--allow-draft-publish");

if (!STRAPI_URL) {
  console.error("Missing STRAPI_URL environment variable.");
  process.exit(1);
}

if (!STRAPI_API_TOKEN) {
  console.error("Missing STRAPI_API_TOKEN environment variable.");
  process.exit(1);
}

interface TaxonomyAuthor {
  slug?: string;
  isPrimary?: boolean;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface StrapiEntity {
  documentId: string;
  [key: string]: unknown;
}

async function strapiFetch<T>(
  path: string,
  init: RequestInit = {},
  query: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`/api/${path}`, STRAPI_URL);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      ...init.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} /api/${path} -> ${response.status} ${response.statusText}\n${body.slice(0, 500)}`
    );
  }

  return body ? (JSON.parse(body) as T) : ({} as T);
}

/** Fields whose current value differs from the desired one. */
function diffFields(
  current: Record<string, unknown>,
  desired: Record<string, string>
): Record<string, string> {
  const changes: Record<string, string> = {};
  for (const [key, value] of Object.entries(desired)) {
    if (current[key] !== value) {
      changes[key] = value;
    }
  }
  return changes;
}

/**
 * Per-row bookkeeping Strapi maintains for each of the draft and published
 * versions of a document. These always differ between the two and say nothing
 * about content.
 */
const DOCUMENT_METADATA = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "locale",
]);

/**
 * Content fields where the draft disagrees with the published record, ignoring
 * the fields this script is about to overwrite anyway.
 *
 * Publishing is all-or-nothing: `?status=published` promotes the entire draft
 * row. Anything listed here is an edit somebody chose not to publish, and it
 * would go live as a side effect of the address change.
 */
function divergentFields(
  draft: Record<string, unknown>,
  published: Record<string, unknown>,
  owned: Iterable<string>
): string[] {
  const ignored = new Set([...DOCUMENT_METADATA, ...owned]);
  const keys = new Set([...Object.keys(draft), ...Object.keys(published)]);

  return [...keys]
    .filter((key) => !ignored.has(key))
    .filter(
      (key) => JSON.stringify(draft[key]) !== JSON.stringify(published[key])
    )
    .sort();
}

function report(
  label: string,
  current: Record<string, unknown>,
  desired: Record<string, string>,
  changes: Record<string, string>
): void {
  console.log(`\n${label}`);
  for (const key of Object.keys(desired)) {
    const marker = key in changes ? "~" : " ";
    const from = JSON.stringify(current[key]);
    const to = JSON.stringify(desired[key]);
    console.log(
      key in changes
        ? `  ${marker} ${key}: ${from} -> ${to}`
        : `  ${marker} ${key}: ${to} (already correct)`
    );
  }
}

/**
 * Refuses the author write when publishing it would take unrelated draft edits
 * live with it.
 *
 * `PUT /api/authors/:documentId?status=published` patches the draft row and
 * then publishes that whole row -- Strapi replaces the published version with
 * the draft wholesale, so this is not a four-field write in the way the rest of
 * the script is. An editor who saved a half-written bio without publishing it
 * would find it on the site as a side effect of a location fix.
 */
async function assertAuthorDraftIsSafeToPublish(
  published: StrapiEntity,
  slug: string,
  owned: Iterable<string>
): Promise<void> {
  const draftResponse = await strapiFetch<{ data: StrapiEntity[] }>(
    "authors",
    {},
    {
      "filters[slug][$eq]": slug,
      "pagination[pageSize]": "1",
      status: "draft",
    }
  );

  const draft = draftResponse.data[0];
  if (!draft) {
    console.warn(
      `\n  ! Could not read the draft version of author "${slug}"; publishing without the divergence check.`
    );
    return;
  }

  const divergent = divergentFields(draft, published, owned);
  if (divergent.length === 0) {
    return;
  }

  const message = [
    "",
    `  ! The draft of author "${slug}" differs from the published record in: ${divergent.join(", ")}.`,
    "    Publishing the address change promotes the entire draft, so those edits would go live too.",
  ].join("\n");

  if (ALLOW_DRAFT_PUBLISH) {
    console.warn(`${message}\n    --allow-draft-publish given; continuing.`);
    return;
  }

  if (!APPLY) {
    console.warn(
      `${message}\n    --apply would refuse this write. Publish or revert them in the Strapi admin first, or pass --allow-draft-publish.`
    );
    return;
  }

  console.error(
    `${message}\n    Publish or revert them in the Strapi admin first, or re-run with --allow-draft-publish.`
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const authors = (taxonomy as { authors?: TaxonomyAuthor[] }).authors;
  if (!Array.isArray(authors)) {
    console.error("data/taxonomy.json: expected 'authors' to be an array.");
    process.exit(1);
  }

  // Mirrors the primary-author rule in seed.ts.
  const primaryAuthor = authors.find((author) => author.isPrimary) ?? authors[0];
  if (!primaryAuthor?.slug) {
    console.error("data/taxonomy.json: no primary author with a slug.");
    process.exit(1);
  }

  const { addressLocality, addressRegion, addressCountry } = primaryAuthor;
  if (!addressLocality || !addressRegion || !addressCountry) {
    console.error(
      `data/taxonomy.json: author ${primaryAuthor.slug} is missing part of its address; refusing to write a partial one.`
    );
    process.exit(1);
  }

  const desiredAuthor = { addressLocality, addressRegion, addressCountry };
  const desiredSettings = { locationLine: `${addressLocality}, ${addressRegion}` };

  console.log(`Strapi: ${STRAPI_URL}`);
  console.log(`Mode:   ${APPLY ? "APPLY (will write)" : "dry run (no writes)"}`);

  // --- site-setting (single type) -----------------------------------------
  const settingsResponse = await strapiFetch<{ data: StrapiEntity | null }>(
    "site-setting"
  );
  const settings = settingsResponse.data;
  if (!settings) {
    console.error("Strapi: site-setting single type has no entry to update.");
    process.exit(1);
  }
  const settingsChanges = diffFields(settings, desiredSettings);
  report(`site-setting (${settings.documentId})`, settings, desiredSettings, settingsChanges);

  // --- author -------------------------------------------------------------
  const authorResponse = await strapiFetch<{ data: StrapiEntity[] }>(
    "authors",
    {},
    { "filters[slug][$eq]": primaryAuthor.slug, "pagination[pageSize]": "1" }
  );
  const author = authorResponse.data[0];
  if (!author) {
    console.error(`Strapi: no author with slug "${primaryAuthor.slug}".`);
    process.exit(1);
  }

  // This script selects by slug; apps/web selects by the flag
  // (`getPrimaryAuthor` filters `isPrimary=true`, newest first). Writing a
  // record the runtime does not read would report success while production
  // kept rendering the stale address, so require the two to agree.
  if (author.isPrimary !== true) {
    console.error(
      `Strapi: author "${primaryAuthor.slug}" is not flagged isPrimary, so apps/web will not read it. Fix the isPrimary flags in Strapi before syncing.`
    );
    process.exit(1);
  }

  const authorChanges = diffFields(author, desiredAuthor);
  report(`author ${primaryAuthor.slug} (${author.documentId})`, author, desiredAuthor, authorChanges);

  const pending =
    Object.keys(settingsChanges).length + Object.keys(authorChanges).length;

  if (pending === 0) {
    console.log("\nNothing to do -- Strapi already matches the repo.");
    return;
  }

  // Before *any* write, not between the two: the footer reads site-setting and
  // the Person JSON-LD reads the author, so aborting between them would leave
  // the two disagreeing -- a worse state than the one being fixed. Runs on a
  // dry run too, so the divergence is known before committing to --apply.
  if (Object.keys(authorChanges).length > 0) {
    await assertAuthorDraftIsSafeToPublish(
      author,
      primaryAuthor.slug,
      Object.keys(desiredAuthor)
    );
  }

  if (!APPLY) {
    console.log(
      `\n${pending} field(s) would change. Re-run with --apply to write them.`
    );
    return;
  }

  if (Object.keys(settingsChanges).length > 0) {
    await strapiFetch(`site-setting`, {
      method: "PUT",
      body: JSON.stringify({ data: settingsChanges }),
    });
    console.log(`\n  ✓ site-setting updated: ${Object.keys(settingsChanges).join(", ")}`);
  }

  if (Object.keys(authorChanges).length > 0) {
    await strapiFetch(
      `authors/${author.documentId}`,
      {
        method: "PUT",
        body: JSON.stringify({ data: authorChanges }),
      },
      { status: "published" }
    );
    console.log(`  ✓ author updated: ${Object.keys(authorChanges).join(", ")}`);
  }

  console.log("\nDone. Re-run without --apply to confirm.");
}

main().catch((error) => {
  console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
