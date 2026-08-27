import test from "node:test";
import assert from "node:assert/strict";

import { blankToUndefined, firstFilled } from "../src/lib/strings.ts";

// One definition of "blank" for CMS-sourced copy (#89). Before this module the
// rule was written out three times -- `firstFilled` in blog-listing.ts and a
// `normalizeString` in each of site-profile.ts and taxonomy-seed.ts -- which is
// how two /about surfaces ended up with neither.

test("blankToUndefined treats an empty string as absent", () => {
  assert.equal(blankToUndefined(""), undefined);
});

test("blankToUndefined treats a whitespace-only string as absent", () => {
  // The defect the whole class turns on: `"   "` is truthy, so `{value && ...}`
  // renders an empty element rather than nothing (#80, #89).
  assert.equal(blankToUndefined("   "), undefined);
  assert.equal(blankToUndefined("\n\t "), undefined);
});

test("blankToUndefined returns a filled string trimmed", () => {
  assert.equal(blankToUndefined("  Miami, FL  "), "Miami, FL");
});

test("blankToUndefined treats null and undefined as absent", () => {
  assert.equal(blankToUndefined(null), undefined);
  assert.equal(blankToUndefined(undefined), undefined);
});

test("blankToUndefined treats non-string values as absent", () => {
  // Strapi JSON fields are typed loosely enough that a number or object can
  // reach a string slot; callers want `undefined`, not `"0"` or `"[object …]"`.
  assert.equal(blankToUndefined(0), undefined);
  assert.equal(blankToUndefined(42), undefined);
  assert.equal(blankToUndefined({}), undefined);
  assert.equal(blankToUndefined([]), undefined);
  assert.equal(blankToUndefined(false), undefined);
});

test("firstFilled picks the first non-blank candidate", () => {
  assert.equal(firstFilled("", "  ", "Principal AI Engineer"), "Principal AI Engineer");
});

test("firstFilled skips blank candidates rather than letting them win", () => {
  // This is the `??` bug: nullish-coalescing stops at `""` because `""` is not
  // nullish, so a blank CMS value beats a good fallback (#75/#77/#79/#83).
  assert.equal(firstFilled("", "fallback"), "fallback");
  assert.equal(firstFilled("   ", "fallback"), "fallback");
});

test("firstFilled trims the candidate it returns", () => {
  assert.equal(firstFilled(null, "  spaced  "), "spaced");
});

test("firstFilled returns undefined when every candidate is blank", () => {
  assert.equal(firstFilled(), undefined);
  assert.equal(firstFilled("", "   ", null, undefined), undefined);
});

test("firstFilled keeps candidate order when several are filled", () => {
  // Callers pass CMS value first and the Site Profile fallback last, so a
  // reordering or a `findLast` rewrite must fail here.
  assert.equal(firstFilled("cms", "fallback"), "cms");
  assert.equal(firstFilled("jobTitle", "headline", "authorRole"), "jobTitle");
});
