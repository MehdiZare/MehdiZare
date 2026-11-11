import test from "node:test";
import assert from "node:assert/strict";

// Postgres returns NULL publishedDate first under DESC. A taxonomy window of
// exactly 12 rows then loses a dated post that the in-memory sort cannot
// restore. Own file: serverEnv freezes DISABLE_STRAPI_CMS at import.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const dated = Array.from({ length: 12 }, (_, index) => ({
  id: index + 2,
  slug: `dated-${String(index).padStart(2, "0")}`,
  publishedDate: `2026-08-${String(28 - index).padStart(2, "0")}`,
  publishedAt: "2026-08-01T00:00:00.000Z",
}));

// Order Strapi would return for publishedDate:desc: the undated row first.
const rows = [
  { id: 1, slug: "undated", publishedDate: null, publishedAt: "2026-02-25T14:55:26.603Z" },
  ...dated,
];

let requestedPageSize: string | null = null;

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  requestedPageSize = url.searchParams.get("pagination[pageSize]");
  const limit = Number(requestedPageSize ?? rows.length);
  return new Response(
    JSON.stringify({
      data: rows.slice(0, limit),
      meta: { pagination: { page: 1, pageSize: limit, pageCount: 1, total: rows.length } },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}) as typeof fetch;

const { getTagListingArticles, TAXONOMY_LISTING_PAGE_SIZE } = await import(
  "../src/lib/blog-listing.ts"
);
const { LISTING_OVERFETCH } = await import("../src/lib/article-dates.ts");

test("a taxonomy listing over-fetches so an undated post does not drop a dated one", async () => {
  const articles = await getTagListingArticles("llms");

  assert.equal(requestedPageSize, String(TAXONOMY_LISTING_PAGE_SIZE + LISTING_OVERFETCH));
  assert.deepEqual(
    articles.map((article) => article.slug),
    dated.map((article) => article.slug),
    "the 12 newest dated posts survive; the undated row does not take one of their slots"
  );
});
