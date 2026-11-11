import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildConsultingFallback,
  consultingDescription,
  consultingHeadline,
  consultingMetadataTitle,
} from "../src/content/fallbacks/consulting.ts";
import { normalizeSiteProfile } from "../src/lib/site-profile.ts";

// The consulting <h1> and the document title are both repo-owned. They are
// different strings: the heading is the offer, the document title is the
// search title. Neither may fall back to a short hardcoded "Consulting".

test("consulting fallback heading stays the approved offer headline", () => {
  const { title, subtitle } = buildConsultingFallback(normalizeSiteProfile(undefined));
  assert.equal(title, consultingHeadline);
  assert.match(subtitle, /remotely\.$/);
  assert.doesNotMatch(title, /High-Stakes/);
});

test("consulting generateMetadata uses the search title and description, not a short fallback", () => {
  const page = readFileSync(resolve(process.cwd(), "src/app/consulting/page.tsx"), "utf8");

  assert.match(page, /title:\s*consultingMetadataTitle/);
  assert.match(page, /description:\s*consultingDescription/);
  assert.equal(
    consultingMetadataTitle,
    "AI and cloud architecture for founders and CTOs"
  );
  assert.match(consultingDescription, /Remote\.$/);
  assert.doesNotMatch(
    page,
    /title:\s*["']Consulting["']/,
    "a short hardcoded title was the latent wrong fallback the CMS used to hide"
  );
  assert.match(page, /<h1[^>]*>\{data\.title\}<\/h1>/);
});
