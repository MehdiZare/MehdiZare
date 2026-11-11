import test from "node:test";
import assert from "node:assert/strict";

// TS-07 / GEO-12: RSS 2.0 at /feed.xml, plus the same newest-posts query
// feeding llms.txt. Strapi is stubbed at fetch, the single choke point, so the
// query string is real. Own file: serverEnv freezes DISABLE_STRAPI_CMS.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const SITE = "https://www.mehdi-zare.com";

let rows: Array<Record<string, unknown>> = [];
let failCms = false;
const requested: URL[] = [];

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  requested.push(url);
  if (failCms) return new Response("down", { status: 503, statusText: "Service Unavailable" });
  return new Response(
    JSON.stringify({ data: rows, meta: { pagination: { page: 1, pageSize: 25, pageCount: 1 } } }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}) as typeof fetch;

const { GET, revalidate } = await import("../src/app/feed.xml/route.ts");
const { GET: getLlmsTxt } = await import("../src/app/llms.txt/route.ts");
const { buildRssFeed, escapeXml, FEED_ALTERNATE_TYPES } = await import("../src/lib/feed.ts");

const POSTS = [
  {
    id: 1,
    title: "Older & wiser",
    slug: "older",
    excerpt: "An <older> post.",
    publishedDate: "2026-08-01",
    publishedAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    category: { name: "LLMs in Production", slug: "llms-in-production" },
    tags: [{ name: "MCP", slug: "mcp" }],
    author: { name: "Mehdi Zare, CFA" },
  },
  {
    id: 2,
    title: "Newest",
    slug: "newest",
    excerpt: "The newest post.",
    publishedDate: null,
    publishedAt: "2026-09-01T09:30:00.000Z",
    updatedAt: "2026-09-02T09:30:00.000Z",
    tags: [],
  },
  {
    id: 3,
    title: "Hidden",
    slug: "hidden",
    publishedAt: "2026-10-01T09:30:00.000Z",
    seo: { metaRobots: "noindex, follow" },
  },
];

async function fetchFeed() {
  requested.length = 0;
  const response = await GET();
  return { response, body: await response.text() };
}

test("feed.xml serves RSS 2.0 with one item per indexable post, newest first", async () => {
  rows = POSTS;
  failCms = false;
  const { response, body } = await fetchFeed();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/rss+xml; charset=utf-8");
  assert.match(body, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/);
  assert.match(body, new RegExp(`<atom:link href="${SITE}/feed\\.xml" rel="self" type="application/rss\\+xml"/>`));
  assert.match(body, new RegExp(`<link>${SITE}/blog</link>`));

  const items = body.split("<item>").slice(1);
  assert.equal(items.length, 2, "the noindex post is not syndicated");
  assert.match(items[0], /<title>Newest<\/title>/, "undated posts sort by publishedAt, not to the top");
  assert.match(items[1], /<title>Older &amp; wiser<\/title>/);

  const older = items[1];
  assert.match(older, new RegExp(`<link>${SITE}/blog/older</link>`));
  assert.match(older, new RegExp(`<guid isPermaLink="true">${SITE}/blog/older</guid>`));
  assert.match(older, /<pubDate>Sat, 01 Aug 2026 13:00:00 GMT<\/pubDate>/, "pubDate is datePublished: 09:00 New York (EDT) on the editorial date");
  assert.match(older, /<description>An &lt;older&gt; post\.<\/description>/);
  assert.match(older, /<dc:creator>Mehdi Zare, CFA<\/dc:creator>/);
  assert.match(older, /<category>LLMs in Production<\/category>/);
  assert.match(older, /<category>MCP<\/category>/);
  assert.doesNotMatch(body, /<author>/, "RSS <author> must be an email address; the name goes in dc:creator");

  assert.match(body, /<lastBuildDate>Wed, 02 Sep 2026 09:30:00 GMT<\/lastBuildDate>/);
});

test("the feed query asks only for what it renders, in editorial order", async () => {
  rows = POSTS;
  failCms = false;
  await fetchFeed();
  const query = requested.find((url) => url.pathname === "/api/articles")?.searchParams;
  assert.ok(query);
  assert.equal(query.get("sort[0]"), "publishedDate:desc");
  assert.equal(query.get("sort[1]"), "publishedAt:desc");
  assert.equal(query.get("fields[0]"), "title");
  assert.equal(query.get("populate[author][populate][credentials][populate]"), null);
});

test("a CMS outage still serves a valid, empty channel (the build prerenders with the CMS off)", async () => {
  failCms = true;
  const { response, body } = await fetchFeed();
  assert.equal(response.status, 200);
  assert.match(body, /<channel>/);
  assert.match(body, /<\/rss>\n$/);
  assert.doesNotMatch(body, /<item>/);
});

test("llms.txt lists the same posts under Writing", async () => {
  rows = POSTS;
  failCms = false;
  const body = await (await getLlmsTxt()).text();
  assert.match(body, new RegExp(`^- \\[Newest\\]\\(${SITE}/blog/newest\\): The newest post\\.$`, "m"));
  assert.match(body, new RegExp(`^- \\[Older & wiser\\]\\(${SITE}/blog/older\\): An <older> post\\.$`, "m"));
  assert.doesNotMatch(body, /hidden/);
});

test("feed revalidates on the sitemap's window", () => {
  assert.equal(revalidate, 300);
});

test("buildRssFeed caps the item count and skips rows without a slug or title", () => {
  const many = Array.from({ length: 30 }, (_, index) => ({
    id: index,
    title: `Post ${index}`,
    slug: `post-${index}`,
    publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));
  const body = buildRssFeed(
    [...many, { id: 99, title: "", slug: "x", publishedAt: "2026-12-01T00:00:00.000Z" }] as never,
    SITE
  );
  assert.equal(body.split("<item>").length - 1, 20);
  assert.match(body.split("<item>")[1], /<title>Post 29<\/title>/);
});

test("escapeXml drops control characters XML 1.0 forbids", () => {
  assert.equal(escapeXml("a\u0000b\u0007c\td\ne"), "abc\td\ne");
  assert.equal(escapeXml(`"'<>&`), "&quot;&apos;&lt;&gt;&amp;");
});

test("FEED_ALTERNATE_TYPES is ready for alternates.types", () => {
  assert.deepEqual(Object.keys(FEED_ALTERNATE_TYPES), ["application/rss+xml"]);
  assert.equal(FEED_ALTERNATE_TYPES["application/rss+xml"][0].url, "/feed.xml");
});

test("FEED_TITLE is the Site Profile name, not a second copy of it", async () => {
  const { DEFAULT_SITE_PROFILE } = await import("../src/lib/site-profile-defaults.ts");
  const { FEED_TITLE } = await import("../src/lib/feed-constants.ts");
  assert.equal(FEED_TITLE, `${DEFAULT_SITE_PROFILE.siteName} | Blog`);

  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../src/lib/feed-constants.ts", import.meta.url), "utf8");
  assert.match(source, /from "\.\/site-profile-defaults"/);
  assert.doesNotMatch(
    source,
    /from ["']@\/lib\/(seo|feed|strapi)|from ["']\.\/(seo|feed|strapi)/,
    "seo.ts imports this module; importing seo, feed, or strapi here cycles"
  );
});

test("page metadata and the root layout both carry the RSS alternate", async () => {
  const { buildPageMetadata } = await import("../src/lib/seo.ts");
  const metadata = buildPageMetadata({
    pathname: "/about",
    title: "About",
    description: "About the author.",
  });
  assert.deepEqual(metadata.alternates?.types, {
    "application/rss+xml": [{ url: "/feed.xml", title: "Mehdi Zare | Blog" }],
  });
  assert.ok(metadata.alternates?.canonical, "the canonical is still set beside it");

  const { readFileSync } = await import("node:fs");
  const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /alternates:\s*\{[^}]*types:\s*\{\s*\.\.\.FEED_ALTERNATE_TYPES\s*\}/);
  const seo = readFileSync(new URL("../src/lib/seo.ts", import.meta.url), "utf8");
  assert.doesNotMatch(seo, /from\s+["'](\.\/feed|@\/lib\/feed)["']/, "seo.ts must not import lib/feed.ts");
});
