import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_SITE_PROFILE,
  DEFAULT_SOCIAL_LINKS,
} from "../src/lib/site-profile-defaults.ts";
import { fallbackExperiences } from "../src/content/fallbacks/about.ts";

// Site identity copy that the live site actually reads lives in two places:
//
//   data/taxonomy.json                     the primary author record, written
//                                          to Strapi verbatim by the seed
//   apps/web/src/lib/site-profile-defaults  DEFAULT_SITE_PROFILE, the runtime
//                                          fallback apps/web actually reads
//
// A third copy used to live in apps/cms/scripts/seed.ts as `siteSettings`,
// seeded into the `site-setting` type. #116 stopped writing that row: web
// never read it after #112, and seeding it kept a silent-no-op admin surface
// warm. The tripwire is now taxonomy author ↔ defaults. #87 is still the
// proof of the class: a careful one-value change updated two of three and
// missed the third.
//
// These assertions DERIVE the shared key set, so a field added to both
// sources is covered the day it is added. A key that genuinely lives in only
// one source has to be named in an exemption list below, with a reason.

const repoRoot = resolve(process.cwd(), "../..");

interface TaxonomyAuthor {
  isPrimary?: boolean;
  [key: string]: unknown;
}

const taxonomy = JSON.parse(
  readFileSync(resolve(repoRoot, "data/taxonomy.json"), "utf8")
) as { authors: TaxonomyAuthor[] };

const primaryAuthor =
  taxonomy.authors.find((author) => author.isPrimary) ?? taxonomy.authors[0];

/**
 * Keys on the taxonomy author with no DEFAULT_SITE_PROFILE counterpart, and
 * why. Adding a key here is a deliberate statement that the value is not
 * duplicated -- if it is, guard it instead.
 */
const AUTHOR_ONLY_KEYS = new Map<string, string>([
  ["isPrimary", "structural flag consumed by the seed, not rendered copy"],
  ["headline", "no defaults counterpart; the web fallback for role is authorRole"],
  ["credentials", "CMS-only; the web surfaces read credentials from Strapi"],
  ["sameAs", "compared against DEFAULT_SOCIAL_LINKS by its own test below"],
]);

/**
 * Taxonomy author keys whose defaults counterpart is not derivable by the
 * `author` + PascalCase rule.
 */
const AUTHOR_KEY_ALIASES = new Map<string, string>([
  ["jobTitle", "authorRole"],
]);

/**
 * The taxonomy author fields that currently resolve to a DEFAULT_SITE_PROFILE
 * counterpart, and are therefore value-compared below.
 *
 * Asserted as a set rather than as a count: a floor with slack silently
 * tolerates a field dropping out of the mapping, which is exactly the failure
 * the exemption lists exist to prevent.
 */
const COMPARED_AUTHOR_KEYS = [
  "name",
  "slug",
  "bioShort",
  "websiteUrl",
  "linkedinUrl",
  "jobTitle",
  "worksForName",
  "worksForUrl",
  "alumniOf",
  "knowsAbout",
  "addressLocality",
  "addressRegion",
  "addressCountry",
];

function pascalCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The DEFAULT_SITE_PROFILE key a taxonomy author key maps to, if any. */
function defaultsKeyFor(authorKey: string): string | undefined {
  const alias = AUTHOR_KEY_ALIASES.get(authorKey);
  if (alias) {
    return alias;
  }

  const prefixed = `author${pascalCase(authorKey)}`;
  const candidates = [prefixed, authorKey];
  return candidates.find((candidate) => candidate in DEFAULT_SITE_PROFILE);
}

const defaults = DEFAULT_SITE_PROFILE as unknown as Record<string, unknown>;

test("every taxonomy author field with a defaults counterpart carries the same value", () => {
  assert.ok(primaryAuthor, "data/taxonomy.json: expected a primary author");

  const compared: string[] = [];
  for (const key of Object.keys(primaryAuthor)) {
    if (AUTHOR_ONLY_KEYS.has(key)) {
      continue;
    }

    const defaultsKey = defaultsKeyFor(key);
    if (!defaultsKey) {
      continue;
    }

    compared.push(key);
    assert.deepEqual(
      primaryAuthor[key],
      defaults[defaultsKey],
      `data/taxonomy.json author.${key} disagrees with DEFAULT_SITE_PROFILE.${defaultsKey}. The seeded CMS author wins at runtime, so this is the #87 failure shape: the footer and the Person JSON-LD end up naming different things.`
    );
  }

  assert.deepEqual(
    [...compared].sort(),
    [...COMPARED_AUTHOR_KEYS].sort(),
    `the set of taxonomy author fields compared against DEFAULT_SITE_PROFILE changed. If a field was deliberately removed or renamed, update COMPARED_AUTHOR_KEYS; if it silently stopped mapping, that is the bug this test exists to catch.`
  );
});

test("a taxonomy author field with no defaults counterpart is declared, not silent", () => {
  const unmatched = Object.keys(primaryAuthor).filter(
    (key) => !AUTHOR_ONLY_KEYS.has(key) && !defaultsKeyFor(key)
  );

  assert.deepEqual(
    unmatched,
    [],
    `these data/taxonomy.json author fields map to nothing in DEFAULT_SITE_PROFILE: ${unmatched.join(", ")}. Either add the counterpart so the value is guarded, or name the field in AUTHOR_ONLY_KEYS with a reason.`
  );
});

test("declared exemptions still exist, so the lists cannot rot into noise", () => {
  for (const key of AUTHOR_ONLY_KEYS.keys()) {
    assert.ok(
      key in primaryAuthor,
      `AUTHOR_ONLY_KEYS names "${key}", which is no longer a taxonomy author field -- drop it`
    );
    assert.ok(
      !defaultsKeyFor(key),
      `AUTHOR_ONLY_KEYS exempts "${key}", but DEFAULT_SITE_PROFILE now has a counterpart (${defaultsKeyFor(key)}) -- drop the exemption so the value is compared`
    );
  }
  for (const [authorKey, defaultsKey] of AUTHOR_KEY_ALIASES) {
    assert.ok(
      authorKey in primaryAuthor,
      `AUTHOR_KEY_ALIASES maps "${authorKey}", which is no longer a taxonomy author field -- drop it`
    );
    assert.ok(
      defaultsKey in defaults,
      `AUTHOR_KEY_ALIASES points "${authorKey}" at "${defaultsKey}", which is no longer a DEFAULT_SITE_PROFILE key`
    );
  }
});

function platformUrlPairs(
  links: ReadonlyArray<{ platform?: unknown; url?: unknown }>
): Array<{ platform: unknown; url: unknown }> {
  return links.map((link) => ({ platform: link.platform, url: link.url }));
}

test("the social links agree between the taxonomy author and the web defaults", () => {
  const fromDefaults = platformUrlPairs(DEFAULT_SOCIAL_LINKS);
  const fromTaxonomy = platformUrlPairs(
    primaryAuthor.sameAs as Array<{ platform?: unknown; url?: unknown }>
  );

  assert.deepEqual(fromTaxonomy, fromDefaults);
});

test("the footer location line matches the structured address defaults", () => {
  assert.equal(
    DEFAULT_SITE_PROFILE.locationLine,
    `${DEFAULT_SITE_PROFILE.authorAddressLocality}, ${DEFAULT_SITE_PROFILE.authorAddressRegion}`
  );
});

test("the current employer name agrees across visible copies and structured data (#105)", () => {
  assert.ok(primaryAuthor, "data/taxonomy.json: expected a primary author");

  const canonical = primaryAuthor.worksForName;
  assert.equal(
    canonical,
    DEFAULT_SITE_PROFILE.authorWorksForName,
    "taxonomy worksForName and DEFAULT_SITE_PROFILE.authorWorksForName must agree before comparing visible copies"
  );

  const trackRecordSource = readFileSync(
    resolve(repoRoot, "apps/web/src/components/home/TrackRecord.tsx"),
    "utf8"
  );
  assert.match(
    trackRecordSource,
    /DEFAULT_SITE_PROFILE\.authorWorksForName/,
    "TrackRecord must source the current employer from DEFAULT_SITE_PROFILE.authorWorksForName, not a hardcoded literal"
  );

  assert.equal(
    fallbackExperiences[0]?.company,
    DEFAULT_SITE_PROFILE.authorWorksForName,
    "the about fallback's current experience company must match authorWorksForName"
  );
});
