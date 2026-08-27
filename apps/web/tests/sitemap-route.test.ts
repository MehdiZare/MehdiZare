import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "true";
delete process.env.ENABLE_BINA_PRINT;
delete process.env.NEXT_PUBLIC_ENABLE_BINA_PRINT;

const { default: sitemap, dynamic, maxDuration, maxValidDate, revalidate } = await import(
  "../src/app/sitemap.ts"
);

test("sitemap includes fallback category/tag entries when CMS is disabled", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.ok(entries.length > 5);
  assert.deepEqual(urls.slice(0, 6), [
    "https://www.mehdi-zare.com",
    "https://www.mehdi-zare.com/about",
    "https://www.mehdi-zare.com/consulting",
    "https://www.mehdi-zare.com/ai-engineer",
    "https://www.mehdi-zare.com/blog",
    "https://www.mehdi-zare.com/contact",
  ]);
  assert.ok(urls.includes("https://www.mehdi-zare.com/blog/category/ai-engineering"));
  assert.ok(urls.includes("https://www.mehdi-zare.com/blog/tag/llms"));
  assert.ok(urls.includes("https://www.mehdi-zare.com/author/mehdi-zare"));
  assert.equal(maxDuration, 20);
  assert.equal(dynamic, "force-dynamic");
  assert.equal(revalidate, 0);
});

test("blog lastModified uses the newest valid article timestamp, not wall-clock now", () => {
  const olderPublished = "2024-01-01T00:00:00.000Z";
  const newerEdit = "2025-06-15T12:00:00.000Z";
  const now = new Date("2026-08-26T00:00:00.000Z");

  assert.equal(
    maxValidDate([olderPublished, newerEdit], now).toISOString(),
    newerEdit,
    "past updatedAt values must still beat a later fallback seed"
  );
  assert.equal(maxValidDate([undefined, "not-a-date"], now).toISOString(), now.toISOString());
  assert.equal(maxValidDate([], now).toISOString(), now.toISOString());
});
