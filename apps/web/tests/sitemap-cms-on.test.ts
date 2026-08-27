import test from "node:test";
import assert from "node:assert/strict";

// The CMS-off contract lives in sitemap-route.test.ts. This file covers the
// opposite branch: a reachable Strapi, so mapArticlePages / mapAuthorPages,
// empty-slug skips, STRAPI_MAX_PAGES, the narrowed article query, new-post
// membership + /blog lastmod, cache: "no-store" on collection reads, and
// SITEMAP_DEADLINE_MS < maxDuration actually execute.
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
  /** Article pagination[page] that should fail (504), to pin partial results. */
  failArticlePage?: number;
}

function emptyScenario(): Scenario {
  return { articles: [], authors: [], categories: [], tags: [], articlePageCount: 1 };
}

let scenario: Scenario = emptyScenario();
let requestedPaths: string[] = [];
let requestedUrls: URL[] = [];
let requestedCaches: Array<RequestCache | undefined> = [];
let stallCms = false;
const stalledRejects: Array<(reason?: unknown) => void> = [];

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

// Stub the single choke point every Strapi read funnels through
// (fetchAPI -> fetchStrapi -> fetch). This covers URL building and pagination
// param serialization too, which mocking `@/lib/strapi` would skip.
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (stallCms) {
    return new Promise<Response>((_resolve, reject) => {
      stalledRejects.push(reject);
    });
  }

  const url = new URL(String(input));
  requestedPaths.push(url.pathname);
  requestedUrls.push(url);
  requestedCaches.push(init?.cache);

  const page = Number(url.searchParams.get("pagination[page]") ?? "1");
  const collection = (rows: Row[], pageCount: number) =>
    jsonResponse({
      data: page === 1 ? rows : [],
      meta: { pagination: { page, pageSize: 100, pageCount } },
    });

  switch (url.pathname) {
    case "/api/articles":
      if (scenario.failArticlePage != null && page === scenario.failArticlePage) {
        return new Response("gateway timeout", { status: 504, statusText: "Gateway Timeout" });
      }
      return collection(scenario.articles, scenario.articlePageCount);
    case "/api/authors":
      return collection(scenario.authors, 1);
    case "/api/categories":
      return collection(scenario.categories, 1);
    case "/api/tags":
      return collection(scenario.tags, 1);
    default:
      // The sitemap no longer reads page single types (#100); anything reaching
      // here is unexpected, so keep the shape valid but contribute nothing.
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
  requestedCaches = [];
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
  assert.deepEqual(
    post.images,
    [`${SITE_URL}/cms-uploads/cover.png`],
    "a featuredImage must be carried through as an absolute proxied URL"
  );
});

test("a malformed featuredImage still emits the article loc", async () => {
  const { entries, urls } = await runSitemap({
    articles: [
      {
        slug: "valid-post",
        updatedAt: "2026-02-02T00:00:00.000Z",
        featuredImage: { url: 123 },
      },
    ],
  });

  assert.deepEqual(articleUrls(urls), [`${SITE_URL}/blog/valid-post`]);
  const post = entries.find((entry) => entry.url === `${SITE_URL}/blog/valid-post`);
  assert.equal(post?.images, undefined);
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

test("a well-formed CMS author replaces the fallback author page", async () => {
  const { urls } = await runSitemap({
    authors: [
      { slug: "" },
      { slug: "jane-doe", updatedAt: "2026-02-01T00:00:00.000Z" },
    ],
  });

  assert.deepEqual(
    urls.filter((url) => url.startsWith(`${SITE_URL}/author/`)),
    [`${SITE_URL}/author/jane-doe`],
    "mapAuthorPages must emit the CMS author instead of the taxonomy fallback"
  );
});

test("article pagination stops at STRAPI_MAX_PAGES", async () => {
  await runSitemap({ articlePageCount: 99 });

  const articlePages = requestedUrls
    .filter((url) => url.pathname === "/api/articles")
    .map((url) => url.searchParams.get("pagination[page]"));

  assert.ok(
    articlePages.length < 99,
    `pagination must not follow pageCount to the end; made ${articlePages.length} requests`
  );
  assert.deepEqual(
    articlePages,
    Array.from({ length: 20 }, (_, index) => String(index + 1)),
    "pins STRAPI_MAX_PAGES and pagination[page] serialization — update deliberately if the cap moves"
  );
});

test("a later article page failure keeps page-1 URLs instead of dropping the catalog", async () => {
  const { urls } = await runSitemap({
    articles: [{ slug: "page-one", updatedAt: "2026-02-02T00:00:00.000Z" }],
    articlePageCount: 3,
    failArticlePage: 2,
  });

  assert.deepEqual(
    articleUrls(urls),
    [`${SITE_URL}/blog/page-one`],
    "page 1 must survive a timeout on page 2 rather than serving a zero-article fallback"
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
  assert.deepEqual(
    urls.filter((url) => url.startsWith(`${SITE_URL}/blog/tag/`)),
    [`${SITE_URL}/blog/tag/cms-tag`],
    "blank CMS tag slugs are skipped rather than emitted as /blog/tag/null"
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
    [params.get("fields[0]"), params.get("fields[1]"), params.get("fields[2]")],
    ["slug", "updatedAt", "publishedAt"],
    "narrowing the query is what keeps the full article populate out of the sitemap read"
  );
  assert.equal(params.get("populate[featuredImage][fields][0]"), "url");
  assert.equal(
    params.get("populate[author][populate][credentials][populate]"),
    null,
    "the sitemap must not pull author credentials or seo.metaImage"
  );
});

// Removed with the single-type fetches themselves (#100). This asserted that
// bina-print shared a Promise.all round with home/about/consulting so it could
// not add a serial STRAPI_TIMEOUT_MS hop. The sitemap no longer reads any page
// single type -- their copy is in the repo -- so there is no round to share.

test("the sitemap never reads page single types or site-setting", async () => {
  const { entries } = await runSitemap({
    articles: [{ slug: "valid-post", updatedAt: "2026-02-02T00:00:00.000Z" }],
  });

  const forbidden = requestedPaths.filter((path) =>
    [
      "/api/home-page",
      "/api/about-page",
      "/api/consulting-page",
      "/api/bina-print-page",
      "/api/site-setting",
      "/api/newsletter-page",
    ].includes(path)
  );
  assert.deepEqual(
    forbidden,
    [],
    "page copy is repo-owned (#100); reintroducing these fetches would resurrect stale lastmods"
  );

  const home = entries.find((entry) => entry.url === SITE_URL);
  assert.ok(home, "home must remain in the sitemap");
  assert.notEqual(
    home.lastModified instanceof Date ? home.lastModified.toISOString() : home.lastModified,
    "2026-01-01T00:00:00.000Z",
    "static lastmod must not come from the stub single-type updatedAt fixture"
  );
});

test("a newly published CMS article is included and /blog lastModified tracks it", async () => {
  const { entries, urls } = await runSitemap({
    articles: [
      {
        slug: "older-post",
        updatedAt: "2026-08-24T14:51:40.766Z",
        publishedAt: "2026-08-24T14:51:40.766Z",
      },
      {
        slug: "how-i-actually-use-grok-bot",
        updatedAt: "2026-08-27T18:20:00.000Z",
        publishedAt: "2026-08-27T18:30:00.000Z",
      },
    ],
  });

  assert.ok(
    urls.includes(`${SITE_URL}/blog/older-post`),
    "existing CMS posts must stay in the sitemap"
  );
  assert.ok(
    urls.includes(`${SITE_URL}/blog/how-i-actually-use-grok-bot`),
    "a newly published CMS slug must appear without being hardcoded in sitemap.ts"
  );

  const blog = entries.find((entry) => entry.url === `${SITE_URL}/blog`);
  assert.ok(blog, "/blog must remain in the sitemap");
  assert.equal(
    blog.lastModified instanceof Date ? blog.lastModified.toISOString() : blog.lastModified,
    "2026-08-27T18:30:00.000Z",
    "/blog lastModified must bump to the newest article publishedAt/updatedAt"
  );

  const grok = entries.find(
    (entry) => entry.url === `${SITE_URL}/blog/how-i-actually-use-grok-bot`
  );
  assert.equal(
    grok?.lastModified instanceof Date ? grok.lastModified.toISOString() : grok?.lastModified,
    "2026-08-27T18:30:00.000Z",
    "article lastmod is max(updatedAt, publishedAt) so it is not older than publish time"
  );
});

test("sitemap collection reads bypass the shared Strapi fetch cache", async () => {
  await runSitemap({
    articles: [{ slug: "valid-post", updatedAt: "2026-02-02T00:00:00.000Z" }],
  });

  const articleCaches = requestedUrls
    .map((url, index) => ({ path: url.pathname, cache: requestedCaches[index] }))
    .filter(({ path }) =>
      ["/api/articles", "/api/authors", "/api/categories", "/api/tags"].includes(path)
    )
    .map(({ cache }) => cache);

  assert.ok(articleCaches.length > 0, "the sitemap must read CMS collections");
  assert.ok(
    articleCaches.every((cache) => cache === "no-store"),
    "sitemap CMS reads must not reuse the 600s Strapi fetch cache that listing pages use"
  );
});

test("the CMS deadline leaves room to serve the fallback", () => {
  assert.ok(
    SITEMAP_DEADLINE_MS < maxDuration * 1000,
    `the deadline (${SITEMAP_DEADLINE_MS}ms) must fire while the isolate is still ` +
      `alive to serve buildDegradedSitemap (maxDuration ${maxDuration}s)`
  );
});

test("a stalled CMS still serves the taxonomy fallback before maxDuration", async (t) => {
  stallCms = true;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.after(() => {
    stallCms = false;
    for (const reject of stalledRejects.splice(0)) {
      reject(new Error("stalled CMS test cleanup"));
    }
  });

  const pending = sitemap();
  t.mock.timers.tick(SITEMAP_DEADLINE_MS);
  const entries = await pending;
  const urls = entries.map((entry) => entry.url);

  assert.ok(urls.includes(`${SITE_URL}/blog/category/ai-engineering`));
  assert.ok(urls.includes(`${SITE_URL}/blog/tag/llms`));
  assert.ok(urls.includes(`${SITE_URL}/author/mehdi-zare`));
  assert.deepEqual(articleUrls(urls), [], "deadline fallback must not emit CMS article URLs");
});

test("in-flight CMS fetches can fail after the deadline without becoming unhandledRejections", async (t) => {
  stallCms = true;
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };
  process.on("unhandledRejection", onUnhandled);
  t.after(() => {
    process.off("unhandledRejection", onUnhandled);
    stallCms = false;
    stalledRejects.length = 0;
  });

  const pending = sitemap();
  t.mock.timers.tick(SITEMAP_DEADLINE_MS);
  const entries = await pending;
  assert.ok(entries.length > 0, "fallback must already have been served");

  for (const reject of stalledRejects.splice(0)) {
    reject(new Error("late CMS failure"));
  }
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(
    unhandled,
    [],
    "in-flight CMS work that fails after fallback is served must not surface as unhandledRejection"
  );
});
