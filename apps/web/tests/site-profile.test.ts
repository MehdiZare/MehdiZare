import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/lib/site-profile.ts"), "utf8");

test("Site Profile enforces a required field contract", () => {
  assert.match(source, /REQUIRED_SITE_PROFILE_FIELDS/);
  assert.match(source, /"positioningHeadline"/);
  assert.match(source, /"positioningSubheadline"/);
  assert.match(source, /"primaryCtaLabel"/);
  assert.match(source, /"authorBioShort"/);
});

test("Site Profile supports strict validation mode", () => {
  assert.match(source, /process\.env\.SITE_PROFILE_STRICT === "true"/);
  assert.match(source, /SiteProfileValidationError/);
});

test("Site Profile keeps non-strict fallback behavior", () => {
  assert.match(source, /return mergeProfile\(undefined/);
  assert.match(source, /return mergeProfile\(settings\)/);
});
