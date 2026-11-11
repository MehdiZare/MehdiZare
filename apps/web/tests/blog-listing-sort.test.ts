import test from "node:test";
import assert from "node:assert/strict";

// CM-02: /blog and /blog/page/N sort by the editorial publishedDate, with the
// system publishedAt as a tiebreak. Postgres puts a NULL publishedDate first
// under DESC, so the page Strapi returns is re-sorted in memory. Own file:
// serverEnv freezes DISABLE_STRAPI_CMS at import.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const articleQueries: URL[] = [];

// Rows in the order Postgres would return them for
// `ORDER BY published_date DESC, published_at DESC`: NULLs first.
const ROWS = [
  { id: 1, slug: "undated", publishedDate: null, publishedAt: "2026-02-25T14:55:26.603Z" },
  { id: 2, slug: "newest", publishedDate: "2026-08-30", publishedAt: "2026-08-30T14:00:00.000Z" },
  { id: 3, slug: "middle", publishedDate: "2026-05-01", publishedAt: "2026-10-01T00:00:00.000Z" },
];

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  if (url.pathname === "/api/articles") articleQueries.push(url);
  const data = url.pathname === "/api/articles" ? ROWS : [];
  return new Response(
    JSON.stringify({ data, meta: { pagination: { page: 1, pageSize: 9, pageCount: 1, total: data.length } } }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}) as typeof fetch;

const { getBlogListingData } = await import("../src/lib/blog-listing.ts");

test("the blog listing requests the editorial sort and does not lead with an undated post", async () => {
  const { articles } = await getBlogListingData(1);

  const query = articleQueries[0]?.searchParams;
  assert.ok(query, "the listing must read /api/articles");
  assert.equal(query.get("sort[0]"), "publishedDate:desc");
  assert.equal(query.get("sort[1]"), "publishedAt:desc");

  assert.deepEqual(
    articles.map((article) => article.slug),
    ["newest", "middle", "undated"],
    "a re-publish (middle) does not jump ahead of a newer editorial date, and NULL publishedDate is not first"
  );
});
