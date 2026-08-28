import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #116. After page copy became repo-owned, seeding these single-types wrote
// rows that an admin can still edit -- and that edit now silently does
// nothing in production. Stop writing them. The Strapi types stay (dropping
// a single type drops its table); the seed must not keep them warm.

const seed = readFileSync(
  resolve(process.cwd(), "../../apps/cms/scripts/seed.ts"),
  "utf8"
);

const retired = [
  "site-setting",
  "home-page",
  "about-page",
  "consulting-page",
  "bina-print-page",
  "newsletter-page",
];

test("the CMS seed no longer upserts retired page single-types or site-setting", () => {
  for (const type of retired) {
    assert.doesNotMatch(
      seed,
      new RegExp(`putSingleType\\(\\s*["']${type}["']`),
      `seed.ts still writes ${type}; that row is not read by apps/web (#116)`
    );
    assert.doesNotMatch(
      seed,
      new RegExp(`strapiFetch(?:<[^>]+>)?\\(\\s*["']${type}["']`),
      `seed.ts still fetches ${type} as a write path; that row is not read by apps/web (#116)`
    );
  }
});

test("the CMS seed still writes the records the site actually reads", () => {
  assert.match(seed, /upsertAuthorBySlug/);
  assert.match(seed, /seedCategories/);
  assert.match(seed, /seedTags/);
});
