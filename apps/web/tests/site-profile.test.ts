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

test("Site Profile keeps strict validation opt-in per call, never ambient", () => {
  // #100 took the `site-setting` row out of the read path, so production passes
  // `settings` as `undefined`. An ambient `SITE_PROFILE_STRICT=true` would find
  // every required field missing and throw on every request, so the env switch
  // is gone and must not come back. `options.strict` still validates settings a
  // caller hands over.
  // Asserted on `process.env` rather than on the variable name, so that naming
  // the retired switch in a comment does not trip the guard that removed it.
  assert.doesNotMatch(source, /process\.env/);
  assert.match(source, /options\.strict === true/);
  assert.match(source, /SiteProfileValidationError/);
});

test("Site Profile keeps non-strict fallback behavior", () => {
  assert.match(source, /return mergeProfile\(undefined/);
  assert.match(source, /return mergeProfile\(settings\)/);
});
