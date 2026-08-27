import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildConsultingFallback } from "../src/content/fallbacks/consulting.ts";
import { normalizeSiteProfile } from "../src/lib/site-profile.ts";

// Dropping the consulting-page CMS read retitled /consulting from
// "AI Consulting for High-Stakes Teams" to a short constant when the CMS was
// offline (#100). The <h1> and generateMetadata must share the fallback title
// so GSC keeps the pinned string in both configurations.

const PINNED_TITLE = "AI Consulting for High-Stakes Teams";

test("consulting fallback title stays the GSC-pinned string", () => {
  const { title } = buildConsultingFallback(normalizeSiteProfile(undefined));
  assert.equal(title, PINNED_TITLE);
});

test("consulting generateMetadata takes its title from the same fallback as the h1", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/consulting/page.tsx"), "utf8");

  assert.match(page, /const \{ title: consultingTitle \} = buildConsultingFallback\(siteProfile\)/);
  assert.match(page, /title:\s*consultingTitle/);
  assert.doesNotMatch(
    page,
    /title:\s*["']Consulting["']/,
    "a short hardcoded title was the latent wrong fallback the CMS used to hide"
  );
});
