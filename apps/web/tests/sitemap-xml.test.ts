import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import type { MetadataRoute } from "next";

process.env.DISABLE_STRAPI_CMS = "true";
process.env.BUILD_TIME = "2026-08-20T12:00:00.000Z";
delete process.env.ENABLE_BINA_PRINT;
delete process.env.NEXT_PUBLIC_ENABLE_BINA_PRINT;

const require = createRequire(import.meta.url);
// The serializer Next's own `app/sitemap.ts` metadata route uses; the route
// handler must produce the same document so crawlers see no change.
const { resolveSitemap } = require("next/dist/build/webpack/loaders/metadata/resolve-route-data.js") as {
  resolveSitemap: (data: MetadataRoute.Sitemap) => string;
};

const { serializeSitemap } = await import("../src/lib/sitemap-xml.ts");
const { default: buildSitemap } = await import("../src/lib/sitemap.ts");
const { GET } = await import("../src/app/sitemap-main.xml/route.ts");
const { PHASE_PRODUCTION_BUILD } = await import("next/constants.js");

const FIXTURE: MetadataRoute.Sitemap = [
  {
    url: "https://www.mehdi-zare.com/",
    lastModified: new Date("2026-11-11T12:00:00.000Z"),
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    url: "https://www.mehdi-zare.com/blog/some-post",
    lastModified: "2026-08-30T13:00:00.000Z",
    changeFrequency: "monthly",
    priority: 0,
    images: ["https://media.mehdi-zare.com/some_post_cover.webp"],
  },
  {
    url: "https://www.mehdi-zare.com/about",
    alternates: { languages: { "es-US": "https://www.mehdi-zare.com/es/about" } },
  },
];

test("matches Next's metadata-route serializer byte for byte", () => {
  assert.equal(serializeSitemap(FIXTURE), resolveSitemap(FIXTURE));
});

test("matches Next's serializer on the real sitemap entries", async () => {
  const entries = await buildSitemap();
  assert.ok(entries.length > 5);
  assert.equal(serializeSitemap(entries), resolveSitemap(entries));
});

test("escapes XML special characters that Next writes raw", () => {
  const xml = serializeSitemap([
    {
      url: "https://www.mehdi-zare.com/search?q=a&b=<c>",
      images: ["https://media.mehdi-zare.com/x.webp?w=1&h=2"],
    },
  ]);
  assert.match(xml, /<loc>https:\/\/www\.mehdi-zare\.com\/search\?q=a&amp;b=&lt;c&gt;<\/loc>/);
  assert.match(xml, /<image:loc>https:\/\/media\.mehdi-zare\.com\/x\.webp\?w=1&amp;h=2<\/image:loc>/);
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/);
});

test("refuses video entries instead of dropping them", () => {
  assert.throws(
    () =>
      serializeSitemap([
        {
          url: "https://www.mehdi-zare.com/",
          videos: [{ title: "t", thumbnail_loc: "https://x/t.jpg", description: "d" }],
        },
      ]),
    /video/
  );
});

test("the route serves the sitemap as XML", async (t) => {
  // CMS-off is a degraded build (taxonomy fallback). It is served at build
  // time; a runtime regeneration would throw to keep the cached copy, which
  // tests/sitemap-cms-on.test.ts covers.
  process.env.NEXT_PHASE = PHASE_PRODUCTION_BUILD;
  t.after(() => {
    delete process.env.NEXT_PHASE;
  });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/xml; charset=utf-8");
  const body = await response.text();
  assert.equal(body, serializeSitemap(await buildSitemap()));
  assert.match(body, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset /);
  assert.match(body, /<loc>https:\/\/www\.mehdi-zare\.com\/blog<\/loc>/);
});
