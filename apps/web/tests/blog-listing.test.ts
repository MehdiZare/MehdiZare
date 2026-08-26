import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";

const { buildPageMetadata } = await import("../src/lib/seo.ts");
const {
  buildTagListingDescription,
  formatTagName,
  resolveTagListingCopy,
} = await import("../src/lib/blog-listing.ts");

test("buildTagListingDescription uses the shared tagged-articles sentence", () => {
  assert.equal(buildTagListingDescription("LangGraph"), "Articles tagged LangGraph.");
});

test("tag listing copy with empty intro and description does not use the homepage blurb", () => {
  const metadataCopy = resolveTagListingCopy({
    slug: "empty-intro-tag",
    name: "Empty Intro Tag",
    seedName: "Seed Name That Should Lose",
    intro: "",
    seedIntro: "   ",
    tagDescription: undefined,
    seedDescription: null,
  });
  const visibleCopy = resolveTagListingCopy({
    slug: "empty-intro-tag",
    name: "Empty Intro Tag",
    seedName: "Seed Name That Should Lose",
    intro: "",
    seedIntro: "   ",
    tagDescription: undefined,
    seedDescription: null,
  });

  assert.equal(metadataCopy.tagName, "Empty Intro Tag");
  assert.equal(metadataCopy.pageDescription, "Articles tagged Empty Intro Tag.");
  assert.equal(visibleCopy.pageDescription, metadataCopy.pageDescription);
  assert.equal(
    metadataCopy.pageDescription.includes(DEFAULT_SITE_PROFILE.siteDescription),
    false
  );

  const metadata = buildPageMetadata({
    pathname: "/blog/tag/empty-intro-tag",
    title: metadataCopy.tagName,
    description: metadataCopy.pageDescription,
    seo: {
      id: 1,
      metaDescription: "",
    },
  });
  assert.equal(metadata.description, visibleCopy.pageDescription);
  assert.equal(
    String(metadata.description).includes(DEFAULT_SITE_PROFILE.siteDescription),
    false
  );
});

test("tag listing copy prefers CMS or seed name over a slug-only catch-path label", () => {
  const copy = resolveTagListingCopy({
    slug: "llm-systems",
    seedName: "LLM Systems",
    seedIntro: "",
    seedDescription: "",
  });

  assert.equal(copy.tagName, "LLM Systems");
  assert.equal(copy.pageDescription, "Articles tagged LLM Systems.");
  assert.notEqual(copy.pageDescription, `Articles tagged ${formatTagName("llm-systems")}.`);
});

test("tag listing copy falls back to a slug-derived name when CMS and seed names are empty", () => {
  const copy = resolveTagListingCopy({
    slug: "production-ai",
    name: "",
    seedName: undefined,
    intro: "",
    seedIntro: "",
    tagDescription: "",
    seedDescription: "",
  });

  assert.equal(copy.tagName, "Production Ai");
  assert.equal(copy.pageDescription, "Articles tagged Production Ai.");
});
