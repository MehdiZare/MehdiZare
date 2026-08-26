import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/lib/seo.ts"), "utf8");

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const noIndexCallSites = [
  { file: "src/app/not-found.tsx", title: "Page Not Found" },
  { file: "src/app/blog/[slug]/page.tsx", title: "Post Not Found" },
  { file: "src/app/author/[slug]/page.tsx", title: "Author Not Found" },
  { file: "src/app/blog/category/[slug]/page.tsx", title: "Category Not Found" },
  { file: "src/app/blog/tag/[slug]/page.tsx", title: "Tag Not Found" },
  { file: "src/app/blog/page/[page]/page.tsx", title: "Blog Page Not Found" },
  { file: "src/app/bina-print/page.tsx", title: "Bina Print Not Found" },
] as const;

test("metadata builder keeps canonical URL + social metadata defaults", () => {
  assert.match(source, /resolveCanonicalUrl/);
  assert.match(source, /card: "summary_large_image"/);
  assert.match(source, /alternates:\s*{\s*canonical/);
  assert.match(source, /composeDocumentTitle/);
  assert.match(source, /title:\s*\{\s*absolute:\s*documentTitle/);
});

test("noindex metadata helper composes titles and disables indexing", () => {
  assert.match(source, /export function buildNoIndexMetadata\(title: string\)/);
  assert.match(source, /const documentTitle = composeDocumentTitle\(title\)/);
  assert.match(source, /index:\s*false/);
  assert.match(source, /follow:\s*false/);
});

test("not-found generateMetadata call sites use buildNoIndexMetadata", () => {
  for (const { file, title } of noIndexCallSites) {
    const pageSource = readSource(file);
    assert.match(pageSource, /buildNoIndexMetadata/, file);
    assert.match(pageSource, new RegExp(`buildNoIndexMetadata\\("${title}"\\)`), file);
    assert.doesNotMatch(
      pageSource,
      /title:\s*"(Page|Post|Author|Category|Tag) Not Found"/,
      file
    );
  }
});

test("author metadata does not fall back to the homepage site description", () => {
  const pageSource = readSource("src/app/author/[slug]/page.tsx");
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.match(pageSource, /author\.bioShort \?\? `Articles by \$\{author\.name\}\.`/);
});

test("article metadata does not fall back to the homepage site description", () => {
  const pageSource = readSource("src/app/blog/[slug]/page.tsx");
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.match(pageSource, /article\.excerpt \|\| article\.title/);
});

test("bina-print metadata does not fall back to the homepage site description", () => {
  const pageSource = readSource("src/app/bina-print/page.tsx");
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.match(pageSource, /fallbackBinaPrintData\.heroSubheadline/);
  assert.match(pageSource, /!isBinaPrintEnabled\(\)/);
  assert.match(pageSource, /buildNoIndexMetadata\("Bina Print Not Found"\)/);
});

test("tag listing metadata shares the listing copy helper and never uses the site blurb", () => {
  const pageSource = readSource("src/app/blog/tag/[slug]/page.tsx");
  assert.match(pageSource, /resolveTagListingCopy/);
  assert.match(pageSource, /tag\?\.seo\?\.metaDescription \?\? pageDescription/);
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.doesNotMatch(pageSource, /getSiteProfile/);
});

test("paginated blog 404s use the noindex helper for invalid and out-of-range pages", () => {
  const pageSource = readSource("src/app/blog/page/[page]/page.tsx");
  assert.match(pageSource, /buildNoIndexMetadata\("Blog Page Not Found"\)/);
  assert.match(pageSource, /parsePositivePageNumber/);
  assert.match(pageSource, /currentPage > pagination\.pageCount/);
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
