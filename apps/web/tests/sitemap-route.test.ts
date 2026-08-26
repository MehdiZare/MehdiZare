import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "true";

const { default: sitemap, maxDuration } = await import("../src/app/sitemap.ts");

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
});
