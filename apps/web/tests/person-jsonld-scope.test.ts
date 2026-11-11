import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { toPersonId, getSiteUrl } = await import("../src/lib/seo.ts");
const { isSiteOwnerAuthor, resolveAuthorPersonId } = await import(
  "../src/lib/author-identity.ts"
);

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, "..", relativePath), "utf8");
}

// GEO-01 / TS-04. The site owner used to be two unrelated Person entities:
// `/#person` (root layout, every page) and `/author/mehdi-zare#person` (author
// page only), and every post's `author` pointed at the second one -- a node
// that does not exist on the post page. There is now one id per human.

test("the site owner resolves to the site-level /#person id", () => {
  const siteUrl = getSiteUrl();

  assert.equal(toPersonId(), `${siteUrl}/#person`);
  assert.equal(
    resolveAuthorPersonId({ slug: "mehdi-zare", isPrimary: true }, "mehdi-zare"),
    `${siteUrl}/#person`
  );
  // isPrimary is optional on the CMS record; a slug match is the same signal.
  assert.equal(resolveAuthorPersonId({ slug: "mehdi-zare" }, "mehdi-zare"), `${siteUrl}/#person`);
  // No author relation means the site owner's article.
  assert.equal(resolveAuthorPersonId(null, "mehdi-zare"), `${siteUrl}/#person`);
});

test("a guest author keeps a profile-scoped id, distinct from the owner's", () => {
  const siteUrl = getSiteUrl();

  assert.equal(isSiteOwnerAuthor({ slug: "jane-doe" }, "mehdi-zare"), false);
  assert.equal(
    resolveAuthorPersonId({ slug: "jane-doe" }, "mehdi-zare"),
    `${siteUrl}/author/jane-doe#person`
  );
  assert.notEqual(resolveAuthorPersonId({ slug: "jane-doe" }, "mehdi-zare"), toPersonId());
});

test("layout, author page and post page all derive the Person id from one rule", () => {
  const layoutSource = readSource("src/app/layout.tsx");
  const authorPageSource = readSource("src/app/author/[slug]/page.tsx");
  const postPageSource = readSource("src/app/blog/[slug]/page.tsx");

  assert.match(layoutSource, /const personId = toPersonId\(\)/);

  for (const [name, source] of [
    ["author page", authorPageSource],
    ["post page", postPageSource],
  ] as const) {
    assert.match(source, /resolveAuthorPersonId\(/, `${name} must use resolveAuthorPersonId`);
    assert.doesNotMatch(
      source,
      /toPersonId\(authorPath\)/,
      `${name} must not mint a profile-scoped id for the site owner (GEO-01)`
    );
  }
});

test("the owner's author page does not emit a second Person node", () => {
  const authorPageSource = readSource("src/app/author/[slug]/page.tsx");

  assert.match(authorPageSource, /const personJsonLd = authorIsSiteOwner\s*\?\s*null/);
  assert.match(authorPageSource, /personId,\s*\}\)\}/, "ProfilePage.mainEntity uses the shared personId");
});
