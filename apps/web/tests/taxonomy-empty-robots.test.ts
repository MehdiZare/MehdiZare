import test from "node:test";
import assert from "node:assert/strict";

// TS-02 / CM-09 / GEO-14: a category or tag listing with no posts renders a
// "No posts yet" page. It must be `noindex, follow`. A CMS outage is "unknown",
// not "empty", and must leave the page indexable.
//
// Loads the real route modules against a stubbed Strapi (fetch is the single
// choke point), so the metadata decision runs on the same article reads the
// page body makes. Own file: serverEnv freezes DISABLE_STRAPI_CMS at import.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

type Row = Record<string, unknown>;

interface Scenario {
  categories: Row[];
  tags: Row[];
  /** Article rows by category or tag slug filter. */
  articlesByCategory: Record<string, Row[]>;
  articlesByTag: Record<string, Row[]>;
  failArticles?: boolean;
}

let scenario: Scenario = { categories: [], tags: [], articlesByCategory: {}, articlesByTag: {} };
const articleQueries: URL[] = [];

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function collection(rows: Row[]): Response {
  return json({ data: rows, meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: rows.length } } });
}

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  const params = url.searchParams;
  switch (url.pathname) {
    case "/api/categories": {
      const slug = params.get("filters[slug][$eq]");
      return collection(scenario.categories.filter((row) => !slug || row.slug === slug));
    }
    case "/api/tags": {
      const slug = params.get("filters[slug][$eq]");
      return collection(scenario.tags.filter((row) => !slug || row.slug === slug));
    }
    case "/api/articles": {
      articleQueries.push(url);
      if (scenario.failArticles) {
        return new Response("bad gateway", { status: 502, statusText: "Bad Gateway" });
      }
      const category = params.get("filters[category][slug][$eq]");
      const tag = params.get("filters[tags][slug][$eq]");
      if (category) return collection(scenario.articlesByCategory[category] ?? []);
      if (tag) return collection(scenario.articlesByTag[tag] ?? []);
      return collection([]);
    }
    default:
      return collection([]);
  }
}) as typeof fetch;

const { generateMetadata: tagMetadata } = await import("../src/app/blog/tag/[slug]/page.tsx");
const { generateMetadata: categoryMetadata } = await import(
  "../src/app/blog/category/[slug]/page.tsx"
);
const { applyEmptyTaxonomyRobots } = await import("../src/lib/blog-listing.ts");

function article(id: number, slug: string): Row {
  return {
    id,
    slug,
    title: slug,
    publishedDate: "2026-08-01",
    publishedAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  };
}

function run(next: Partial<Scenario>) {
  scenario = { categories: [], tags: [], articlesByCategory: {}, articlesByTag: {}, ...next };
  articleQueries.length = 0;
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

test("an empty tag page is noindex, follow", async () => {
  run({ tags: [{ id: 1, slug: "fastapi", name: "FastAPI" }] });
  const metadata = await tagMetadata(params("fastapi"));
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.ok(metadata.alternates?.canonical, "an empty page keeps its self-canonical");
});

test("a tag page with posts keeps the default indexable robots", async () => {
  run({
    tags: [{ id: 1, slug: "llms", name: "LLMs" }],
    articlesByTag: { llms: [article(1, "a-post")] },
  });
  const metadata = await tagMetadata(params("llms"));
  assert.equal(metadata.robots, undefined);
});

test("a tag page stays indexable when the article read fails", async () => {
  run({ tags: [{ id: 1, slug: "llms", name: "LLMs" }], failArticles: true });
  const metadata = await tagMetadata(params("llms"));
  assert.equal(metadata.robots, undefined, "a CMS outage is unknown, not empty");
});

test("an empty category page is noindex, follow", async () => {
  run({ categories: [{ id: 1, slug: "robowrite", name: "RoboWrite", children: [] }] });
  const metadata = await categoryMetadata(params("robowrite"));
  assert.deepEqual(metadata.robots, { index: false, follow: true });
});

test("a parent category whose posts are all in a child stays indexable", async () => {
  run({
    categories: [
      {
        id: 1,
        slug: "ai-engineering",
        name: "AI Engineering",
        children: [{ id: 2, slug: "llms-in-production", name: "LLMs in Production" }],
      },
    ],
    articlesByCategory: { "llms-in-production": [article(1, "child-post")] },
  });
  const metadata = await categoryMetadata(params("ai-engineering"));
  assert.equal(metadata.robots, undefined);

  const filtered = articleQueries.map((url) => url.searchParams.get("filters[category][slug][$eq]"));
  assert.deepEqual(filtered.sort(), ["ai-engineering", "llms-in-production"]);
});

test("taxonomy listings request the editorial sort", async () => {
  run({ tags: [{ id: 1, slug: "llms", name: "LLMs" }] });
  await tagMetadata(params("llms"));
  const query = articleQueries[0].searchParams;
  assert.equal(query.get("sort[0]"), "publishedDate:desc");
  assert.equal(query.get("sort[1]"), "publishedAt:desc");
});

test("applyEmptyTaxonomyRobots only overrides a known-empty listing", () => {
  const base = { title: "x", robots: "index, follow" };
  assert.deepEqual(applyEmptyTaxonomyRobots(base, 0).robots, { index: false, follow: true });
  assert.equal(applyEmptyTaxonomyRobots(base, 3).robots, "index, follow");
  assert.equal(applyEmptyTaxonomyRobots(base, undefined).robots, "index, follow");
});
