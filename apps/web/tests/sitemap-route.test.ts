import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "true";

const { default: sitemap } = await import("../src/app/sitemap.ts");

test("sitemap includes fallback category/tag entries when CMS is disabled", async () => {
  const entries = await sitemap();
  const urls = entries.map((entry) => entry.url);

  assert.ok(entries.length > 5);
  assert.ok(urls.includes("https://www.mehdi-zare.com"));
  assert.ok(urls.includes("https://www.mehdi-zare.com/blog"));
  assert.ok(urls.includes("https://www.mehdi-zare.com/blog/category/ai-engineering"));
  assert.ok(urls.includes("https://www.mehdi-zare.com/blog/tag/llms"));
  assert.ok(urls.some((url) => url.startsWith("https://www.mehdi-zare.com/author/")));
});
