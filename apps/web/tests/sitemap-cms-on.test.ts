import test from "node:test";
import assert from "node:assert/strict";

// The CMS-off contract lives in sitemap-route.test.ts. This file covers the
// opposite branch: a reachable Strapi, so mapArticlePages / mapAuthorPages, the
// empty-slug skips, and the STRAPI_MAX_PAGES cap actually execute.
//
// `serverEnv` freezes DISABLE_STRAPI_CMS at module scope, so this has to be its
// own file — node:test already runs each test file in its own process, which is
// why no --test-isolation flag is needed.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";
delete process.env.ENABLE_BINA_PRINT;
delete process.env.NEXT_PUBLIC_ENABLE_BINA_PRINT;

const SITE_URL = "https://www.mehdi-zare.com";

type Row = Record<string, unknown>;

interface Scenario {
  articles: Row[];
  authors: Row[];
  categories: Row[];
  tags: Row[];
  /** What Strapi claims the article catalog spans, to drive the pagination loop. */
  articlePageCount: number;
}

function emptyScenario(): Scenario {
  return { articles: [], authors: [], categories: [], tags: [], articlePageCount: 1 };
}

let scenario: Scenario = emptyScenario();
let requestedPaths: string[] = [];
let requestedUrls: URL[] = [];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Stub the single choke point every Strapi read funnels through
// (fetchAPI -> fetchStrapi -> fetch). This covers URL building and pagination
// param serialization too, which mocking `@/lib/strapi` would skip.
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  requestedPaths.push(url.pathname);
  requestedUrls.push(url);

  const page = Number(url.searchParams.get("pagination[page]") ?? "1");
  const collection = (rows: Row[], pageCount: number) =>
    jsonResponse({
      data: page === 1 ? rows : [],
      meta: { pagination: { page, pageSize: 100, pageCount } },
    });

  switch (url.pathname) {
    case "/api/articles":
      return collection(scenario.articles, scenario.articlePageCount);
    case "/api/authors":
      return collection(scenario.authors, 1);
    case "/api/categories":
      return collection(scenario.categories, 1);
    case "/api/tags":
      return collection(scenario.tags, 1);
    default:
      // Single types (home/about/consulting) only contribute a lastModified.
      return jsonResponse({ data: { updatedAt: "2026-01-01T00:00:00.000Z" } });
  }
}) as typeof fetch;

const { default: sitemap, maxDuration, SITEMAP_DEADLINE_MS } = await import(
  "../src/app/sitemap.ts"
);

async function runSitemap(next: Partial<Scenario> = {}) {
  scenario = { ...emptyScenario(), ...next };
  requestedPaths = [];
  requestedUrls = [];
  const entries = await sitemap();
  return { entries, urls: entries.map((entry) => entry.url) };
}

/** Article detail pages only — not /blog, /blog/category/*, or /blog/tag/*. */
function articleUrls(urls: string[]): string[] {
  return urls.filter(
    (url) =>
      url.startsWith(`${SITE_URL}/blog/`) &&
      !url.startsWith(`${SITE_URL}/blog/category/`) &&
      !url.startsWith(`${SITE_URL}/blog/tag/`)
  );
}

test("only well-formed article slugs reach the sitemap", async () => {
  const { entries, urls } = await runSitemap({
    articles: [
      { slug: "", updatedAt: "2026-02-01T00:00:00.000Z" },
      { slug: "   ", updatedAt: "2026-02-01T00:00:00.000Z" },
      { slug: 123, updatedAt: "2026-02-01T00:00:00.000Z" },
      { slug: null, updatedAt: "2026-02-01T00:00:00.000Z" },
      {
        slug: "valid-post",
        updatedAt: "2026-02-02T00:00:00.000Z",
        featuredImage: { url: "/uploads/cover.png" },
      },
    ],
  });

  assert.deepEqual(
    articleUrls(urls),
    [`${SITE_URL}/blog/valid-post`],
    "empty, whitespace-only, numeric, and null slugs must all be skipped"
  );

  const post = entries.find((entry) => entry.url === `${SITE_URL}/blog/valid-post`);
  assert.ok(post, "the valid article must be present");
  assert.equal(
    post.lastModified instanceof Date ? post.lastModified.toISOString() : post.lastModified,
    "2026-02-02T00:00:00.000Z",
    "article lastModified comes from its own updatedAt"
  );
  assert.ok(post.images?.length, "a featuredImage must be carried through as an absolute URL");
});

test("only well-formed author slugs reach the sitemap, and the fallback covers none", async () => {
  const { urls } = await runSitemap({
    authors: [{ slug: "" }, { slug: "  " }, { slug: 42 }],
  });

  assert.deepEqual(
    urls.filter((url) => url.startsWith(`${SITE_URL}/author/`)),
    [`${SITE_URL}/author/mehdi-zare`],
    "all-invalid authors must still leave the default author page in the sitemap"
  );
});

test("article pagination stops at STRAPI_MAX_PAGES", async () => {
  await runSitemap({ articlePageCount: 99 });

  const articleRequests = requestedPaths.filter((path) => path === "/api/articles").length;

  assert.ok(
    articleRequests < 99,
    `pagination must not follow pageCount to the end; made ${articleRequests} requests`
  );
  assert.equal(
    articleRequests,
    20,
    "pins STRAPI_MAX_PAGES — update deliberately if the cap moves"
  );
});

test("CMS categories and tags replace the taxonomy fallback", async () => {
  const { urls } = await runSitemap({
    categories: [{ slug: "cms-cat", updatedAt: "2026-02-01T00:00:00.000Z" }, { slug: "  " }],
    tags: [{ slug: "cms-tag", updatedAt: "2026-02-01T00:00:00.000Z" }, { slug: null }],
  });

  assert.ok(urls.includes(`${SITE_URL}/blog/category/cms-cat`));
  assert.ok(urls.includes(`${SITE_URL}/blog/tag/cms-tag`));
  assert.ok(
    !urls.includes(`${SITE_URL}/blog/category/ai-engineering`),
    "a healthy CMS must not also emit the taxonomy.json fallback categories"
  );
  assert.ok(
    !urls.includes(`${SITE_URL}/blog/tag/llms`),
    "a healthy CMS must not also emit the taxonomy.json fallback tags"
  );
  assert.deepEqual(
    urls.filter((url) => url.startsWith(`${SITE_URL}/blog/category/`)),
    [`${SITE_URL}/blog/category/cms-cat`],
    "blank CMS category slugs are skipped rather than emitted as /blog/category/"
  );
});

test("an empty CMS still falls back to taxonomy categories and tags", async () => {
  const { urls } = await runSitemap();

  assert.ok(urls.includes(`${SITE_URL}/blog/category/ai-engineering`));
  assert.ok(urls.includes(`${SITE_URL}/blog/tag/llms`));
  assert.ok(urls.includes(`${SITE_URL}/author/mehdi-zare`));
  assert.deepEqual(articleUrls(urls), [], "no articles means no article entries");
});

test("the article query asks only for what the sitemap renders", async () => {
  await runSitemap({ articles: [{ slug: "valid-post", updatedAt: "2026-02-02T00:00:00.000Z" }] });

  const articleRequest = requestedUrls.find((url) => url.pathname === "/api/articles");
  assert.ok(articleRequest, "the sitemap must read /api/articles");

  const params = articleRequest.searchParams;
  assert.deepEqual(
    [params.get("fields[0]"), params.get("fields[1]")],
    ["slug", "updatedAt"],
    "narrowing the query is what keeps the full article populate out of the sitemap read"
  );
  assert.equal(params.get("populate[featuredImage][fields][0]"), "url");
  assert.equal(
    params.get("populate[author][populate][credentials][populate]"),
    null,
    "the sitemap must not pull author credentials or seo.metaImage"
  );
});

test("the CMS deadline leaves room to serve the fallback", () => {
  assert.ok(
    SITEMAP_DEADLINE_MS < maxDuration * 1000,
    `the deadline (${SITEMAP_DEADLINE_MS}ms) must fire while the isolate is still ` +
      `alive to serve buildDegradedSitemap (maxDuration ${maxDuration}s)`
  );
});
