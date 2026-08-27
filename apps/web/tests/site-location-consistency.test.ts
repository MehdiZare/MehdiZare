import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";

// The site location lives in three hand-maintained places: the web defaults
// (footer + JSON-LD fallback), the CMS author record seeded from
// data/taxonomy.json, and the inline site-settings block in the seed script.
// The CMS copies win at runtime, so a defaults-only edit silently leaves the
// footer and the Person JSON-LD disagreeing after the next seed. These
// assertions fail loudly instead.

interface TaxonomyAuthor {
  isPrimary?: boolean;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

const repoRoot = resolve(process.cwd(), "../..");

const taxonomy = JSON.parse(
  readFileSync(resolve(repoRoot, "data/taxonomy.json"), "utf8")
) as { authors: TaxonomyAuthor[] };

const seedSource = readFileSync(
  resolve(repoRoot, "apps/cms/scripts/seed.ts"),
  "utf8"
);

// Mirrors the primary-author rule in apps/cms/scripts/seed.ts so this test
// tracks whichever record the seed actually writes.
const primaryAuthor =
  taxonomy.authors.find((author) => author.isPrimary) ?? taxonomy.authors[0];

test("the footer location line matches the structured address defaults", () => {
  assert.equal(
    DEFAULT_SITE_PROFILE.locationLine,
    `${DEFAULT_SITE_PROFILE.authorAddressLocality}, ${DEFAULT_SITE_PROFILE.authorAddressRegion}`
  );
});

test("the seeded CMS author address matches the web defaults", () => {
  assert.ok(primaryAuthor, "data/taxonomy.json: expected a primary author");
  assert.equal(
    primaryAuthor.addressLocality,
    DEFAULT_SITE_PROFILE.authorAddressLocality
  );
  assert.equal(
    primaryAuthor.addressRegion,
    DEFAULT_SITE_PROFILE.authorAddressRegion
  );
  assert.equal(
    primaryAuthor.addressCountry,
    DEFAULT_SITE_PROFILE.authorAddressCountry
  );
});

test("the seeded site-settings location line matches the web defaults", () => {
  const seededLocationLine = seedSource.match(/locationLine:\s*"([^"]*)"/)?.[1];

  assert.ok(
    seededLocationLine,
    "apps/cms/scripts/seed.ts: expected a quoted locationLine in siteSettings"
  );
  assert.equal(seededLocationLine, DEFAULT_SITE_PROFILE.locationLine);
});
