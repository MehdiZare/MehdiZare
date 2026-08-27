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
  assert.match(source, /seo\?\.metaDescription\?\.trim\(\) \|\| description/);
});

test("noindex metadata helper composes titles and disables indexing", () => {
  assert.match(source, /export function buildNoIndexMetadata\(title: string\)/);
  assert.match(source, /const documentTitle = composeDocumentTitle\(title\)/);
  assert.match(source, /index:\s*false/);
  assert.match(source, /follow:\s*false/);
  assert.match(source, /canonical:\s*null/);
  assert.match(source, /url:\s*null/);
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
  assert.match(pageSource, /authorListingDescription\(author\.name, author\.bioShort\)/);
  assert.match(pageSource, /bioShort\?\.trim\(\)/);
  assert.match(pageSource, /Articles by \$\{name\}\./);
});

test("article metadata does not fall back to the homepage site description", () => {
  const pageSource = readSource("src/app/blog/[slug]/page.tsx");
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.match(pageSource, /article\.excerpt\?\.trim\(\) \|\| article\.title/);
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
  assert.match(
    pageSource,
    /resolveTagListingCopy\(/,
    "page must call resolveTagListingCopy, not merely import it (#79, #81, #94)"
  );
  assert.match(pageSource, /description:\s*pageDescription/);
  assert.doesNotMatch(pageSource, /siteDescription/);
  assert.doesNotMatch(pageSource, /getSiteProfile/);
});

test("tag listing title comes from the shared copy helper, not a raw headline chain", () => {
  const pageSource = readSource("src/app/blog/tag/[slug]/page.tsx");
  assert.match(pageSource, /title:\s*tagTitle/);
  assert.doesNotMatch(pageSource, /tag\?\.headline\s*\?\?/);
  assert.doesNotMatch(pageSource, /seed\??\.headline\s*\?\?/);
  assert.doesNotMatch(pageSource, /tag\?\.seo\?\.metaTitle\s*\?\?/);
});

test("category listing metadata shares the listing copy helper for intro and description", () => {
  const pageSource = readSource("src/app/blog/category/[slug]/page.tsx");
  assert.match(
    pageSource,
    /resolveCategoryListingCopy\(/,
    "page must call resolveCategoryListingCopy, not merely import it (#77, #94)"
  );
  assert.match(pageSource, /description:\s*pageDescription/);
  assert.doesNotMatch(
    pageSource,
    /category\?\.intro\s*\?\?\s*category\?\.description/
  );
});

test("category listing title comes from the shared copy helper, not a raw headline chain", () => {
  const pageSource = readSource("src/app/blog/category/[slug]/page.tsx");
  assert.match(pageSource, /title:\s*categoryTitle/);
  assert.doesNotMatch(pageSource, /category\?\.headline\s*\?\?/);
  assert.doesNotMatch(pageSource, /seed\??\.headline\s*\?\?/);
  assert.doesNotMatch(pageSource, /category\?\.seo\?\.metaTitle\s*\?\?/);
});

test("category listing parent names route through the display-name helper", () => {
  const pageSource = readSource("src/app/blog/category/[slug]/page.tsx");
  assert.match(
    pageSource,
    /resolveTaxonomyDisplayName\(/,
    "page must call resolveTaxonomyDisplayName, not merely import it (#94)"
  );
  assert.match(pageSource, /category\.parent\.name,\s*category\.parent\.headline/);
  // No trailing comma: `name: category.parent.name ?? resolveTaxonomyDisplayName(...)`
  // reinstates the raw-CMS-name-wins bug while leaving the assertion above green.
  assert.doesNotMatch(
    pageSource,
    /name:\s*category\.parent\.name/,
    "parent name must resolve through resolveTaxonomyDisplayName, not the raw CMS value (#77, #94)"
  );
  assert.doesNotMatch(pageSource, /formatCategoryName/);
});

test("category subcategory cards route names and descriptions through the shared helpers", () => {
  const pageSource = readSource("src/app/blog/category/[slug]/page.tsx");
  const listingSource = readSource("src/lib/blog-listing.ts");

  // The child mapping moved out of the page into resolveSubcategoryCards, so
  // the name-resolution contract is asserted where the mapping now lives.
  // These guards read the page as text, so they also fire on a comment or a
  // string that merely quotes the old shape, and on any object literal keyed
  // over a variable named `child`. Rename the loop variable rather than
  // loosening a guard.
  const inlined =
    "child-card mapping belongs in resolveSubcategoryCards, not the page (#78, #88)";

  assert.match(
    pageSource,
    /resolveSubcategoryCards\(/,
    "page must call resolveSubcategoryCards, not merely import it (#88)"
  );
  assert.doesNotMatch(pageSource, /name:\s*child\.name/, inlined);
  assert.doesNotMatch(pageSource, /child\.name\s*\?\?\s*child\.headline/, inlined);
  assert.doesNotMatch(pageSource, /description:\s*child\.description/, inlined);
  assert.doesNotMatch(pageSource, /id:\s*child\.id/, inlined);
  assert.match(listingSource, /child\.name,\s*child\.headline/);
  assert.match(listingSource, /description:\s*firstFilled\(child\.description\)/);
  assert.doesNotMatch(listingSource, /child\.name\s*\?\?\s*child\.headline/);
});

test("paginated blog 404s use the noindex helper for invalid and out-of-range pages", () => {
  const pageSource = readSource("src/app/blog/page/[page]/page.tsx");
  assert.match(pageSource, /buildNoIndexMetadata\("Blog Page Not Found"\)/);
  assert.match(
    pageSource,
    /parsePositivePageNumber\(/,
    "page must call parsePositivePageNumber, not merely import it (#94)"
  );
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
