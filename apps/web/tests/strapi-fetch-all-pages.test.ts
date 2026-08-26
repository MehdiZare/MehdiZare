import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "false";
process.env.STRAPI_URL = "http://localhost:1337";

const { fetchAllPages, STRAPI_MAX_PAGES, STRAPI_TIMEOUT_MS } = await import(
  "../src/lib/strapi.ts"
);

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

test("fetchAllPages returns earlier pages when a later page fails", async (t) => {
  const warnings: string[] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => {
    warnings.push(String(args[0] ?? ""));
  });

  const items = await fetchAllPages(
    async (params) => {
      const page = params.pagination?.page ?? 0;
      if (page >= 2) {
        throw new Error("page 2 timed out");
      }
      return {
        data: [{ id: page, slug: "page-one" }],
        meta: { pagination: { page, pageSize: 100, pageCount: 3, total: 3 } },
      };
    },
    "articles"
  );

  assert.deepEqual(items, [{ id: 1, slug: "page-one" }]);
  assert.match(warnings.join("\n"), /page 2 failed after 1 row\(s\); returning partial results/);
});

test("fetchAllPages does not start another page that cannot finish before deadlineMs", async (t) => {
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
        meta: { pagination: { page, pageSize: 100, pageCount: 5, total: 5 } },
      };
    },
    "articles",
    {},
    { deadlineMs: Date.now() + STRAPI_TIMEOUT_MS - 1 }
  );

  assert.deepEqual(pages, [1], "page 2 would need a full STRAPI_TIMEOUT_MS and must not start");
  assert.deepEqual(items, [{ id: 1 }]);
  assert.match(warnings.join("\n"), /stopping pagination to honor caller deadline/);
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
