import test from "node:test";
import assert from "node:assert/strict";

// Deploy-order guard for the content-model v2 fields. The CMS deploys on its
// own platform; until it runs with the new article schema, Strapi 5 answers
// `populate[keyTakeaways]` or `fields[]=noindex` with `400 Invalid key`.
// Without the guard a web-first deploy 404s every post (the by-slug read
// fails and the page calls notFound()) and empties the sitemap, feed and
// llms.txt post list. Own file: serverEnv freezes DISABLE_STRAPI_CMS.
process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const V2_KEYS = [
  "contentUpdatedAt",
  "featuredImageAlt",
  "series",
  "seriesPart",
  "crossPostXUrl",
  "crossPostLinkedinUrl",
  "noindex",
  "keyTakeaways",
  "faq",
  "sources",
  "comparisonTables",
];

/** The first v2 key the request names in fields, populate or filters, if any. */
function v2Key(url: URL): string | undefined {
  for (const [key, value] of url.searchParams) {
    for (const field of V2_KEYS) {
      if (
        (key.startsWith("fields[") && value === field) ||
        key.startsWith(`populate[${field}]`) ||
        key.startsWith(`filters[${field}]`)
      ) {
        return field;
      }
    }
  }
  return undefined;
}

let oldCms = true;
const requested: URL[] = [];
const rows = [{ id: 1, slug: "post", title: "Post", publishedAt: "2026-09-01T00:00:00.000Z" }];

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  requested.push(url);
  const key = v2Key(url);
  if (oldCms && key) {
    return new Response(
      JSON.stringify({ data: null, error: { status: 400, name: "ValidationError", message: `Invalid key ${key}` } }),
      { status: 400, statusText: "Bad Request", headers: { "content-type": "application/json" } }
    );
  }
  return new Response(
    JSON.stringify({ data: rows, meta: { pagination: { page: 1, pageSize: 25, pageCount: 1 } } }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}) as typeof fetch;

const { getArticleBySlug, getArticles, getArticlesInSeries, stripContentModelV2 } = await import(
  "../src/lib/strapi.ts"
);

function reset(old: boolean) {
  oldCms = old;
  requested.length = 0;
}

test("the post read asks for the four components; listings do not", async () => {
  reset(false);
  await getArticleBySlug("post");
  await getArticles({ pagination: { page: 1, pageSize: 9 } });
  const [post, listing] = requested;
  for (const component of ["keyTakeaways", "faq", "sources", "comparisonTables"]) {
    assert.equal(post.searchParams.get(`populate[${component}]`), "true", `post populates ${component}`);
    assert.equal(
      [...listing.searchParams.keys()].some((key) => key.startsWith(`populate[${component}]`)),
      false,
      `listing does not populate ${component}`
    );
  }
  assert.equal(post.searchParams.get("filters[slug][$eq]"), "post");
});

test("against a CMS without the new schema the post still loads, minus the new components", async () => {
  reset(true);
  const response = await getArticleBySlug("post");
  assert.equal(response.data[0]?.slug, "post");
  assert.equal(requested.length, 2, "one rejected read, one retry");
  assert.ok(v2Key(requested[0]));
  assert.equal(v2Key(requested[1]), undefined);
  assert.equal(requested[1].searchParams.get("filters[slug][$eq]"), "post", "the retry keeps the slug filter");
  assert.equal(requested[1].searchParams.get("populate[featuredImage][populate]"), "*", "and the old populate");
});

test("a narrowed fields list retries with only the old fields", async () => {
  reset(true);
  await getArticles({ fields: ["slug", "contentUpdatedAt", "noindex"], populate: { seo: { fields: ["metaRobots"] } } });
  assert.equal(requested.length, 2);
  assert.deepEqual(
    [...requested[1].searchParams].filter(([key]) => key.startsWith("fields[")).map(([, value]) => value),
    ["slug"]
  );
  assert.equal(requested[1].searchParams.get("populate[seo][fields][0]"), "metaRobots");
});

test("a 400 with nothing to strip is not retried", async () => {
  reset(true);
  await assert.rejects(getArticles({ filters: { noindex: { $eq: true } } }));
  assert.equal(requested.length, 1, "filters are never stripped, so there is no retry");
});

test("the series lookup is never widened: a rejected series filter means no siblings", async () => {
  reset(true);
  assert.deepEqual(await getArticlesInSeries("Agents"), []);
  assert.equal(requested.length, 1, "no retry without the series filter, which would return every post");

  reset(false);
  const siblings = await getArticlesInSeries("Agents");
  assert.equal(siblings.length, 1);
  const query = requested[0].searchParams;
  assert.equal(query.get("filters[series][$eq]"), "Agents");
  assert.equal(query.get("sort[0]"), "seriesPart:asc");
  assert.deepEqual(
    [...query].filter(([key]) => key.startsWith("fields[")).map(([, value]) => value),
    ["title", "slug", "seriesPart", "publishedDate", "publishedAt"]
  );
  assert.equal(
    [...query.keys()].some((key) => key.startsWith("populate")),
    false,
    "the series nav populates nothing"
  );
});

test("stripContentModelV2 leaves filters and non-v2 keys alone", () => {
  assert.equal(stripContentModelV2({ fields: ["slug"], populate: { seo: true } }), null);
  assert.equal(stripContentModelV2({ populate: "*" }), null);
  assert.deepEqual(
    stripContentModelV2({
      fields: ["slug", "noindex"],
      populate: { seo: true, faq: true },
      filters: { series: { $eq: "x" } },
    }),
    { fields: ["slug"], populate: { seo: true }, filters: { series: { $eq: "x" } } }
  );
});
