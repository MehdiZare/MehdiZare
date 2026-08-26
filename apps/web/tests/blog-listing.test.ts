import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SITE_PROFILE } from "../src/lib/site-profile-defaults.ts";

const { buildPageMetadata } = await import("../src/lib/seo.ts");
const {
  buildTagListingDescription,
  buildCategoryListingDescription,
  formatSlugName,
  resolveTaxonomyDisplayName,
  resolveTagListingCopy,
  resolveCategoryListingCopy,
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
  assert.notEqual(copy.pageDescription, `Articles tagged ${formatSlugName("llm-systems")}.`);
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

test("buildCategoryListingDescription uses the shared in-category sentence", () => {
  assert.equal(buildCategoryListingDescription("AI Engineering"), "Articles in AI Engineering.");
});

test("category listing copy with empty intro and description does not emit blank copy", () => {
  const metadataCopy = resolveCategoryListingCopy({
    slug: "empty-intro-category",
    name: "Empty Intro Category",
    seedName: "Seed Name That Should Lose",
    intro: "",
    seedIntro: "   ",
    categoryDescription: undefined,
    seedDescription: null,
  });

  assert.equal(metadataCopy.categoryName, "Empty Intro Category");
  assert.equal(metadataCopy.pageDescription, "Articles in Empty Intro Category.");

  const metadata = buildPageMetadata({
    pathname: "/blog/category/empty-intro-category",
    title: metadataCopy.categoryName,
    description: metadataCopy.pageDescription,
    seo: {
      id: 1,
      metaDescription: "",
    },
  });
  assert.equal(metadata.description, metadataCopy.pageDescription);
  assert.notEqual(metadata.description, "");
});

test("category listing copy prefers CMS or seed name over a slug-only catch-path label", () => {
  const copy = resolveCategoryListingCopy({
    slug: "llm-systems",
    seedName: "LLM Systems",
    seedIntro: "",
    seedDescription: "",
  });

  assert.equal(copy.categoryName, "LLM Systems");
  assert.equal(copy.pageDescription, "Articles in LLM Systems.");
  assert.notEqual(copy.pageDescription, `Articles in ${formatSlugName("llm-systems")}.`);
});

test("category listing copy falls back to a slug-derived name when CMS and seed names are empty", () => {
  const copy = resolveCategoryListingCopy({
    slug: "production-ai",
    name: "",
    seedName: undefined,
    intro: "",
    seedIntro: "",
    categoryDescription: "",
    seedDescription: "",
  });

  assert.equal(copy.categoryName, "Production Ai");
  assert.equal(copy.pageDescription, "Articles in Production Ai.");
});

test("resolveTaxonomyDisplayName skips empty and whitespace candidates", () => {
  assert.equal(
    resolveTaxonomyDisplayName("agent-frameworks", "", "   ", "Agent Frameworks"),
    "Agent Frameworks"
  );
});

test("resolveTaxonomyDisplayName falls back to the slug label when every candidate is blank", () => {
  assert.equal(
    resolveTaxonomyDisplayName("agent-frameworks", "", null, undefined, "  "),
    "Agent Frameworks"
  );
});

test("resolveTaxonomyDisplayName trims the candidate it returns", () => {
  assert.equal(resolveTaxonomyDisplayName("llm-systems", "  LLM Systems  "), "LLM Systems");
});

test("category listing copy falls back to the resolved name when every headline is empty", () => {
  const copy = resolveCategoryListingCopy({
    slug: "ai-engineering",
    name: "AI Engineering",
    headline: "",
    seedHeadline: "   ",
    intro: "Real intro copy.",
  });

  assert.equal(copy.categoryTitle, "AI Engineering");
  assert.notEqual(copy.categoryTitle, "");
});

test("category listing copy prefers a filled headline over the category name", () => {
  const copy = resolveCategoryListingCopy({
    slug: "ai-engineering",
    name: "AI Engineering",
    headline: "Building AI That Ships",
    intro: "Real intro copy.",
  });

  assert.equal(copy.categoryTitle, "Building AI That Ships");
  assert.equal(copy.categoryName, "AI Engineering");
});

test("category listing copy prefers a seed headline over the CMS name", () => {
  const copy = resolveCategoryListingCopy({
    slug: "ai-engineering",
    name: "AI Engineering",
    headline: "",
    seedHeadline: "Seed Headline",
    intro: "Real intro copy.",
  });

  assert.equal(copy.categoryTitle, "Seed Headline");
});

test("category listing copy title falls back to the slug label when name and headline are blank", () => {
  const copy = resolveCategoryListingCopy({
    slug: "production-ai",
    name: "",
    headline: "",
    seedName: "  ",
    seedHeadline: null,
  });

  assert.equal(copy.categoryTitle, "Production Ai");
  assert.equal(copy.categoryName, "Production Ai");
  assert.equal(copy.pageDescription, "Articles in Production Ai.");
});
