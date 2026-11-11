/**
 * Pushes the repo's canonical site identity into the one Strapi record that
 * still overrides it at runtime.
 *
 * Why this exists (#91, #100): the author record is CMS-backed and the CMS wins.
 * `/author/[slug]` reads it raw, with no repo-side fallback at all, and the
 * Person JSON-LD on /, /contact, /consulting and /author/[slug] is built from
 * it. These are the fields this script owns on author(<primary slug>):
 *
 *   addressLocality, addressRegion, addressCountry   -> Person `address`
 *   worksForName, worksForUrl                        -> Person `worksFor`
 *   headline, jobTitle, bioShort, websiteUrl         -> author page + Person
 *   knowsAbout                                       -> Person `knowsAbout`
 *   credentials (list, replaced whole)               -> Person `hasCredential`
 *   sameAs (list, replaced whole)                    -> Person `sameAs`
 *
 * Each is sent only when `data/taxonomy.json` has the key; a key the taxonomy
 * omits is left alone. An empty `worksForName`/`worksForUrl` pair in the
 * taxonomy is sent as `null`, which CLEARS the employer in the CMS -- leaving
 * it out instead is how "Entarian" outlived two repositionings (GEO-03).
 * Empty optional strings (headline, jobTitle) clear the same way; the
 * schema-required ones (bioShort, websiteUrl) and the address refuse to go
 * out empty or partial.
 *
 * It used to write `site-setting.locationLine` for the footer as well. The site
 * stopped reading `site-setting` when page copy became repo-owned, so editing
 * the repo constant is now the whole job for footer copy.
 *
 * Started life as `sync-site-location.ts` for the address alone, then grew the
 * employer for #100's Sev1Tech -> Entarian rename, then the rest of the public
 * identity for the founder/consultant repositioning (#147). Extended rather
 * than duplicated, so there is still exactly one way to push identity.
 *
 * `seed.ts` would also fix them, but it is a full upsert of author, categories
 * and tags, so any hand-edit made in the Strapi admin since the last seed is
 * lost. This sends only the fields above that differ, and nothing else.
 *
 * *Sends* -- not "changes". `author` has Draft & Publish enabled, and Strapi 5's
 * REST update writes the payload onto the DRAFT; `?status=published` then
 * publishes the whole draft row, not just the fields in the payload. So:
 *
 *   - an owned field is sent when EITHER the draft or the published value
 *     differs from the taxonomy, so a half-written draft of e.g. `bioShort`
 *     cannot ride along unsent;
 *   - for every other field, the script reads the draft and refuses to write
 *     when it diverges from the published record (override with
 *     `--allow-draft-publish`);
 *   - it refuses unless the slug-matched author is the one apps/web renders.
 *
 * The desired values come from `data/taxonomy.json` -- the same record the seed
 * writes -- so this script cannot disagree with the repo.
 *
 * Usage (dry run is the default -- prints a field-by-field diff, writes nothing):
 *
 *   STRAPI_URL=https://cms.example.com STRAPI_API_TOKEN=<token> \
 *     npx tsx scripts/sync-site-identity.ts [--dry-run]
 *
 * Add `--apply` to write and publish. Fields already correct are never sent.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

export interface TaxonomyAuthor {
  slug?: string;
  isPrimary?: boolean;
  headline?: string;
  jobTitle?: string;
  bioShort?: string;
  websiteUrl?: string;
  knowsAbout?: unknown;
  credentials?: unknown;
  sameAs?: unknown;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  worksForName?: string;
  worksForUrl?: string;
}

export interface StrapiEntity {
  documentId: string;
  [key: string]: unknown;
}

export type StrapiFetch = <T>(
  path: string,
  init?: RequestInit,
  query?: Record<string, string>
) => Promise<T>;

export interface SyncOptions {
  apply: boolean;
  allowDraftPublish: boolean;
  strapiFetch: StrapiFetch;
  log?: (message: string) => void;
  warn?: (message: string) => void;
}

export interface SyncResult {
  /** Fields that differ (dry run) or were written (`--apply`). */
  changes: Record<string, unknown>;
  written: boolean;
}

/** A refusal: the script stops without writing and exits non-zero. */
export class SyncRefusal extends Error {}

/** `shared.credential` attributes, so a missing one compares as null. */
const CREDENTIAL_KEYS = ["title", "issuer", "description", "url"] as const;

/**
 * Populate the component lists this script owns, plus `profileImage`.
 * Publishing promotes the whole draft, and an unpopulated media field is
 * absent from both reads, so a draft-only image change would go live without
 * tripping the divergence check.
 */
const AUTHOR_POPULATE = {
  "populate[0]": "sameAs",
  "populate[1]": "credentials",
  "populate[2]": "profileImage",
} as const;

// Read at runtime rather than `import … from "…/taxonomy.json"`, matching
// seed.ts. `data/` sits outside this package, so a static import would make a
// file the CMS build context never copies into a compile-time dependency.
export function loadTaxonomyAuthors(): unknown {
  const taxonomy = JSON.parse(
    readFileSync(resolve(__dirname, "../../../data/taxonomy.json"), "utf-8")
  ) as { authors?: unknown };
  return taxonomy.authors;
}

export function parseFlags(argv: string[]): { apply: boolean; allowDraftPublish: boolean } {
  const apply = argv.includes("--apply");
  if (apply && argv.includes("--dry-run")) {
    throw new SyncRefusal("Pass either --apply or --dry-run, not both.");
  }
  return { apply, allowDraftPublish: argv.includes("--allow-draft-publish") };
}

export function createStrapiFetch(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch
): StrapiFetch {
  return async <T>(
    path: string,
    init: RequestInit = {},
    query: Record<string, string> = {}
  ): Promise<T> => {
    const url = new URL(`/api/${path}`, baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }

    const response = await fetchImpl(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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
  };
}

/** Mirrors the primary-author rule in seed.ts. */
export function primaryTaxonomyAuthor(authors: unknown): TaxonomyAuthor {
  if (!Array.isArray(authors)) {
    throw new SyncRefusal("data/taxonomy.json: expected 'authors' to be an array.");
  }
  const list = authors as TaxonomyAuthor[];
  const primary = list.find((author) => author.isPrimary) ?? list[0];
  if (!primary?.slug) {
    throw new SyncRefusal("data/taxonomy.json: no primary author with a slug.");
  }
  return primary;
}

function blankToNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasKey(author: TaxonomyAuthor, key: keyof TaxonomyAuthor): boolean {
  return Object.prototype.hasOwnProperty.call(author, key);
}

/**
 * The owned fields and the values they should have, from the taxonomy author.
 * Throws a SyncRefusal rather than build a partial or invalid identity.
 */
export function buildDesiredAuthor(author: TaxonomyAuthor): Record<string, unknown> {
  const slug = author.slug;
  const refuse = (message: string): never => {
    throw new SyncRefusal(`data/taxonomy.json: author ${slug} ${message}`);
  };

  const addressLocality = blankToNull(author.addressLocality);
  const addressRegion = blankToNull(author.addressRegion);
  const addressCountry = blankToNull(author.addressCountry);
  if (!addressLocality || !addressRegion || !addressCountry) {
    refuse("is missing part of its address; refusing to write a partial one.");
  }

  // Same all-or-nothing rule as the address, for the same reason: `worksFor` is
  // one Organization node, and half of one is worse than none. Both empty means
  // "no employer" and is sent as null, so the CMS value is cleared.
  const worksForName = blankToNull(author.worksForName);
  const worksForUrl = blankToNull(author.worksForUrl);
  if (!worksForName !== !worksForUrl) {
    refuse("has only one of worksForName/worksForUrl; refusing to write a partial employer.");
  }

  const desired: Record<string, unknown> = {
    addressLocality,
    addressRegion,
    addressCountry,
    worksForName,
    worksForUrl,
  };

  // Optional in the schema: an empty value clears.
  for (const key of ["headline", "jobTitle"] as const) {
    if (hasKey(author, key)) desired[key] = blankToNull(author[key]);
  }

  // Required in the schema: refuse rather than send an empty value Strapi
  // would reject halfway through (or, worse, accept).
  for (const key of ["bioShort", "websiteUrl"] as const) {
    if (!hasKey(author, key)) continue;
    const value = blankToNull(author[key]);
    if (!value) refuse(`has an empty ${key}, which the CMS requires.`);
    desired[key] = value;
  }

  if (hasKey(author, "knowsAbout")) {
    const topics = author.knowsAbout;
    if (!Array.isArray(topics) || !topics.every((topic) => typeof topic === "string" && topic.trim())) {
      refuse("has a knowsAbout that is not a list of non-empty strings.");
    }
    desired.knowsAbout = (topics as string[]).map((topic) => topic.trim());
  }

  if (hasKey(author, "sameAs")) {
    const links = author.sameAs;
    if (!Array.isArray(links)) refuse("has a sameAs that is not a list.");
    desired.sameAs = (links as Array<Record<string, unknown>>).map((link) => {
      const platform = blankToNull(link?.platform);
      const url = blankToNull(link?.url);
      if (!platform || !url) refuse("has a sameAs entry without both platform and url.");
      return { platform, url };
    });
  }

  if (hasKey(author, "credentials")) {
    const credentials = author.credentials;
    if (!Array.isArray(credentials)) refuse("has credentials that are not a list.");
    desired.credentials = (credentials as Array<Record<string, unknown>>).map((credential) => {
      const entry: Record<string, string | null> = {};
      for (const key of CREDENTIAL_KEYS) entry[key] = blankToNull(credential?.[key]);
      if (!entry.title) refuse("has a credential without a title.");
      return entry;
    });
  }

  return desired;
}

/**
 * Canonical form for comparison: blank strings and undefined are null,
 * component bookkeeping (`id`, `__component`) is dropped, object keys sorted.
 * Strapi returns a fresh `id` per component row, and an unset string field as
 * null, so neither may count as a difference or a cleared field would never
 * settle.
 */
export function canonical(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value === "" ? null : value;
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === "id" || key === "__component") continue;
      out[key] = canonical((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/**
 * Owned fields to send: those where the published record or the draft differs
 * from the desired value. The draft matters because the write publishes it.
 */
export function diffFields(
  published: Record<string, unknown>,
  draft: Record<string, unknown> | null,
  desired: Record<string, unknown>
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(desired)) {
    const publishedDiffers = !sameValue(published[key], value);
    const draftDiffers = draft !== null && !sameValue(draft[key], value);
    if (publishedDiffers || draftDiffers) {
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
 * would go live as a side effect of the identity change.
 */
export function divergentFields(
  draft: Record<string, unknown>,
  published: Record<string, unknown>,
  owned: Iterable<string>
): string[] {
  const ignored = new Set([...DOCUMENT_METADATA, ...owned]);
  const keys = new Set([...Object.keys(draft), ...Object.keys(published)]);

  return [...keys]
    .filter((key) => !ignored.has(key))
    .filter((key) => !sameValue(draft[key], published[key]))
    .sort();
}

function show(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function report(
  log: (message: string) => void,
  label: string,
  published: Record<string, unknown>,
  draft: Record<string, unknown> | null,
  desired: Record<string, unknown>,
  changes: Record<string, unknown>
): void {
  log(`\n${label}`);
  for (const key of Object.keys(desired)) {
    if (!(key in changes)) {
      log(`    ${key}: ${show(desired[key])} (already correct)`);
      continue;
    }
    log(`  ~ ${key}: ${show(published[key])} -> ${show(desired[key])}`);
    if (draft && !sameValue(draft[key], published[key])) {
      log(`      (unpublished draft value: ${show(draft[key])})`);
    }
  }
}

/**
 * Refuses to write unless the record found by slug is the one apps/web renders.
 *
 * This script resolves a slug from `data/taxonomy.json`; the site does not.
 * `getPrimaryAuthor` (apps/web/src/lib/strapi.ts) filters `isPrimary=true`,
 * sorts `updatedAt:desc` and takes the first -- and `isPrimary` is a plain
 * boolean with no uniqueness constraint, so a *second* flagged record touched
 * more recently wins. Checking the flag alone is not enough: the script would
 * update the slug-matched record, print a success line, and leave production
 * rendering the other one. Mirror the runtime query and compare document ids.
 */
async function assertIsTheAuthorTheSiteRenders(
  strapiFetch: StrapiFetch,
  author: StrapiEntity,
  slug: string
): Promise<void> {
  if (author.isPrimary !== true) {
    throw new SyncRefusal(
      `Strapi: author "${slug}" is not flagged isPrimary, so apps/web will not read it. Fix the isPrimary flags in Strapi before syncing.`
    );
  }

  const response = await strapiFetch<{ data: StrapiEntity[] }>(
    "authors",
    {},
    {
      "filters[isPrimary][$eq]": "true",
      sort: "updatedAt:desc",
      "pagination[pageSize]": "5",
    }
  );

  const primaries = response.data ?? [];
  const rendered = primaries[0];

  if (!rendered) {
    throw new SyncRefusal(
      `Strapi: no author is flagged isPrimary, so apps/web falls back to the most recently updated author. Flag "${slug}" before syncing.`
    );
  }

  if (rendered.documentId !== author.documentId) {
    throw new SyncRefusal(
      `Strapi: apps/web renders author "${rendered.slug}" (${rendered.documentId}), not "${slug}" (${author.documentId}). ${primaries.length} author(s) are flagged isPrimary and the most recently updated one wins. Fix the flags before syncing.`
    );
  }
}

/**
 * Refuses the author write when publishing it would take unrelated draft edits
 * live with it.
 *
 * `PUT /api/authors/:documentId?status=published` patches the draft row and
 * then publishes that whole row -- Strapi replaces the published version with
 * the draft wholesale, so this is not a field-scoped write in the way the rest
 * of the script is. An editor who saved a half-written bio without publishing
 * it would find it on the site as a side effect of a location fix.
 */
function assertAuthorDraftIsSafeToPublish(
  options: SyncOptions,
  published: StrapiEntity,
  draft: StrapiEntity | null,
  slug: string,
  owned: Iterable<string>
): void {
  const warn = options.warn ?? console.warn;

  if (!draft) {
    warn(
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
    "    Publishing the identity change promotes the entire draft, so those edits would go live too.",
  ].join("\n");

  if (options.allowDraftPublish) {
    warn(`${message}\n    --allow-draft-publish given; continuing.`);
    return;
  }

  if (!options.apply) {
    warn(
      `${message}\n    --apply would refuse this write. Publish or revert them in the Strapi admin first, or pass --allow-draft-publish.`
    );
    return;
  }

  throw new SyncRefusal(
    `${message}\n    Publish or revert them in the Strapi admin first, or re-run with --allow-draft-publish.`
  );
}

export async function syncSiteIdentity(
  taxonomyAuthors: unknown,
  options: SyncOptions
): Promise<SyncResult> {
  const log = options.log ?? console.log;
  const { strapiFetch } = options;

  const primaryAuthor = primaryTaxonomyAuthor(taxonomyAuthors);
  const slug = primaryAuthor.slug as string;
  const desiredAuthor = buildDesiredAuthor(primaryAuthor);

  log(`Mode:   ${options.apply ? "APPLY (will write and publish)" : "dry run (no writes; pass --apply to write)"}`);

  // --- author -------------------------------------------------------------
  const authorResponse = await strapiFetch<{ data: StrapiEntity[] }>(
    "authors",
    {},
    { "filters[slug][$eq]": slug, "pagination[pageSize]": "1", ...AUTHOR_POPULATE }
  );
  const author = authorResponse.data?.[0];
  if (!author) {
    throw new SyncRefusal(`Strapi: no author with slug "${slug}".`);
  }

  await assertIsTheAuthorTheSiteRenders(strapiFetch, author, slug);

  // The published row was found by slug. The draft may have a different slug,
  // and a slug filter would then miss it and skip the divergence check.
  const draftResponse = await strapiFetch<{ data: StrapiEntity[] }>(
    "authors",
    {},
    {
      "filters[documentId][$eq]": author.documentId,
      "pagination[pageSize]": "1",
      status: "draft",
      ...AUTHOR_POPULATE,
    }
  );
  const draft = draftResponse.data?.[0] ?? null;

  const changes = diffFields(author, draft, desiredAuthor);
  report(log, `author ${slug} (${author.documentId})`, author, draft, desiredAuthor, changes);

  const pending = Object.keys(changes).length;
  if (pending === 0) {
    log("\nNothing to do -- Strapi already matches the repo.");
    return { changes, written: false };
  }

  // Runs on a dry run too, so an unsafe draft is known before committing to
  // --apply rather than discovered mid-write.
  assertAuthorDraftIsSafeToPublish(options, author, draft, slug, Object.keys(desiredAuthor));

  if (!options.apply) {
    log(`\n${pending} field(s) would change. Re-run with --apply to write and publish them.`);
    return { changes, written: false };
  }

  // Repeatable components are sent whole and without ids, so Strapi replaces
  // the list rather than merging into it.
  await strapiFetch(
    `authors/${author.documentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ data: changes }),
    },
    { status: "published" }
  );
  log(`  ✓ author updated and published: ${Object.keys(changes).join(", ")}`);
  log("\nDone. Re-run without --apply to confirm.");
  return { changes, written: true };
}

async function main(): Promise<void> {
  const { apply, allowDraftPublish } = parseFlags(process.argv.slice(2));

  const strapiUrl = process.env.STRAPI_URL?.trim();
  const strapiApiToken = process.env.STRAPI_API_TOKEN?.trim();
  if (!strapiUrl) throw new SyncRefusal("Missing STRAPI_URL environment variable.");
  if (!strapiApiToken) throw new SyncRefusal("Missing STRAPI_API_TOKEN environment variable.");

  console.log(`Strapi: ${strapiUrl}`);
  await syncSiteIdentity(loadTaxonomyAuthors(), {
    apply,
    allowDraftPublish,
    strapiFetch: createStrapiFetch(strapiUrl, strapiApiToken),
  });
}

if (require.main === module) {
  main().catch((error) => {
    if (error instanceof SyncRefusal) {
      console.error(`\n${error.message}`);
    } else {
      console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    }
    process.exit(1);
  });
}
