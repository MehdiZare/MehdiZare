import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/lib/seo.ts"), "utf8");

test("metadata builder keeps canonical URL + social metadata defaults", () => {
  assert.match(source, /resolveCanonicalUrl/);
  assert.match(source, /card: "summary_large_image"/);
  assert.match(source, /alternates:\s*{\s*canonical/);
});

test("website JSON-LD supports canonical overrides", () => {
  assert.match(source, /buildWebsiteJsonLd\(options: WebsiteJsonLdOptions = {}\)/);
  assert.match(source, /const name = options\.name \?\? SITE_NAME/);
  assert.match(source, /const description = options\.description \?\? DEFAULT_SITE_DESCRIPTION/);
});

test("person JSON-LD supports canonical overrides", () => {
  assert.match(source, /buildPersonJsonLd\(options: PersonJsonLdOptions = {}\)/);
  assert.match(source, /const title = options\.title \?\? PERSON_TITLE/);
  assert.match(source, /const sameAs = options\.sameAs \?\? PERSON_SAME_AS/);
});
