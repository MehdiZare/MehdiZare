import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assertCallsHelper } from "./contract-assertions.ts";

const pageFiles = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/about/page.tsx",
  "src/app/consulting/page.tsx",
  "src/app/ai-engineer/page.tsx",
  "src/app/contact/page.tsx",
  "src/app/blog/page.tsx",
  "src/app/blog/[slug]/page.tsx",
];

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("key pages consume Site Profile as canonical source", () => {
  for (const file of pageFiles) {
    const source = readSource(file);
    assertCallsHelper(source, "getSiteProfile", "#94", file);
  }
});

test("global navigation no longer hardcodes CTA text", () => {
  const source = readSource("src/components/layout/Navbar.tsx");
  assert.doesNotMatch(source, /Let's Talk/);
  assert.match(source, /ctaLabel/);
});

test("global footer no longer hardcodes identity strings", () => {
  const source = readSource("src/components/layout/Footer.tsx");
  assert.doesNotMatch(source, /CFA Charterholder/);
  assert.match(source, /siteName/);
  assert.match(source, /credentialLine/);
});
