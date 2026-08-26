import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const { fetchAllPages, STRAPI_MAX_PAGES } = await import("../src/lib/strapi.ts");

test("fetchAllPages stops when Strapi reports no further pages", async () => {
  const pages: number[] = [];
  const items = await fetchAllPages(
    async (params) => {
      const page = params.pagination?.page ?? 0;
      pages.push(page);
      return {
        data: [{ id: page }],
        meta: { pagination: { page, pageSize: 100, pageCount: 2, total: 2 } },
      };
    },
    "articles"
  );

  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(items, [{ id: 1 }, { id: 2 }]);
});

test("fetchAllPages stops at STRAPI_MAX_PAGES and warns instead of walking pageCount", async (t) => {
  const pages: number[] = [];
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(String(args[0] ?? ""));
  });

  const items = await fetchAllPages(
    async (params) => {
      const page = params.pagination?.page ?? 0;
      pages.push(page);
      return {
        data: [{ id: page }],
        meta: { pagination: { page, pageSize: 100, pageCount: 99, total: 9900 } },
      };
    },
    "articles"
  );

  assert.equal(pages.length, STRAPI_MAX_PAGES);
  assert.equal(items.length, STRAPI_MAX_PAGES);
  assert.match(
    warnings.join("\n"),
    /\[strapi\] articles: stopped after 20 pages/,
    "truncation must be logged, not silent"
  );
});

test("fetchAllPages forces withCount so pageCount is requested", async () => {
  let withCount: boolean | undefined;
  await fetchAllPages(
    async (params) => {
      withCount = params.pagination?.withCount;
      return {
        data: [],
        meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 0 } },
      };
    },
    "tags",
    { sort: "name:asc" }
  );

  assert.equal(withCount, true);
});

test("fetchAllPages rejects non-array collection data", async () => {
  await assert.rejects(
    () =>
      fetchAllPages(
        async () =>
          ({
            data: null,
            meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 0 } },
          }) as never,
        "articles"
      ),
    /expected collection data to be an array/
  );
});
