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
 * touches exactly the four fields above and nothing else.
 *
 * The desired values come from `data/taxonomy.json` -- the same record the seed
 * writes -- so this script cannot disagree with the repo. `locationLine` is
 * derived as `${locality}, ${region}`, the composition
 * `apps/web/tests/site-identity-consistency.test.ts` pins.
 *
 * Usage (dry run -- prints the diff, writes nothing):
 *
 *   STRAPI_URL=https://cms.example.com STRAPI_API_TOKEN=<token> \
 *     npx tsx scripts/sync-site-location.ts
 *
 * Add `--apply` to write. Fields already correct are never sent.
 */

import taxonomy from "../../../data/taxonomy.json";

const STRAPI_URL = process.env.STRAPI_URL?.trim();
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN?.trim();
const APPLY = process.argv.includes("--apply");

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
  const authorChanges = diffFields(author, desiredAuthor);
  report(`author ${primaryAuthor.slug} (${author.documentId})`, author, desiredAuthor, authorChanges);

  const pending =
    Object.keys(settingsChanges).length + Object.keys(authorChanges).length;

  if (pending === 0) {
    console.log("\nNothing to do -- Strapi already matches the repo.");
    return;
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
