import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const { toAbsoluteStrapiMediaUrl } = await import("../src/lib/public-env.ts");

test("toAbsoluteStrapiMediaUrl keeps non-Strapi absolute urls unchanged", () => {
  const url = toAbsoluteStrapiMediaUrl("https://cdn.example.com/image.png");
  assert.equal(url, "https://cdn.example.com/image.png");
});

test("toAbsoluteStrapiMediaUrl rewrites relative /uploads path to /cms-uploads proxy", () => {
  const url = toAbsoluteStrapiMediaUrl("/uploads/image.png");
  assert.equal(url, "/cms-uploads/image.png");
});

test("toAbsoluteStrapiMediaUrl rewrites absolute Strapi URL to proxy path", () => {
  const url = toAbsoluteStrapiMediaUrl("http://localhost:1337/uploads/image.png");
  assert.equal(url, "/cms-uploads/image.png");
});

test("toAbsoluteStrapiMediaUrl returns empty string for empty input", () => {
  const url = toAbsoluteStrapiMediaUrl("");
  assert.equal(url, "");
});

test("toAbsoluteStrapiMediaUrl preserves query/hash when rewriting absolute Strapi URL", () => {
  const url = toAbsoluteStrapiMediaUrl("http://localhost:1337/uploads/image.png?v=1#hero");
  assert.equal(url, "/cms-uploads/image.png?v=1#hero");
});

test("toAbsoluteStrapiMediaUrl preserves query string for relative /uploads path", () => {
  const url = toAbsoluteStrapiMediaUrl("/uploads/image.png?v=2");
  assert.equal(url, "/cms-uploads/image.png?v=2");
});

// TS-01: absolute media URLs on any host other than Strapi stay as they are,
// even when their path starts with /uploads (defensive: an R2 root path of
// `uploads` or a CDN). Production R2 URLs are `https://media.mehdi-zare.com/
// <file>` (or `/media/<file>`) and are pinned below.
const CMS_ORIGIN = "https://cms.example.com";

test("toAbsoluteStrapiMediaUrl keeps absolute R2 /uploads urls on their own host", () => {
  const r2 = "https://media.mehdi-zare.com/uploads/cover_ba8365bf09.webp";
  assert.equal(toAbsoluteStrapiMediaUrl(r2, CMS_ORIGIN), r2);
  // The default origin (localhost:1337 in tests) behaves the same way.
  assert.equal(toAbsoluteStrapiMediaUrl(r2), r2);
});

test("toAbsoluteStrapiMediaUrl rewrites absolute /uploads urls on the Strapi origin", () => {
  const url = toAbsoluteStrapiMediaUrl(`${CMS_ORIGIN}/uploads/cover.webp?v=3`, CMS_ORIGIN);
  assert.equal(url, "/cms-uploads/cover.webp?v=3");
});

test("toAbsoluteStrapiMediaUrl compares the full origin, not just the host", () => {
  const url = "http://cms.example.com/uploads/cover.webp";
  assert.equal(toAbsoluteStrapiMediaUrl(url, CMS_ORIGIN), url);
});

test("toAbsoluteStrapiMediaUrl still rewrites relative /uploads paths", () => {
  assert.equal(toAbsoluteStrapiMediaUrl("/uploads/cover.webp", CMS_ORIGIN), "/cms-uploads/cover.webp");
});

test("next.config.ts always allows the CMS media host and inlines the Strapi origin", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  // CSP img-src derives from the same host list, so this covers both.
  assert.match(source, /const CMS_MEDIA_HOST = "media\.mehdi-zare\.com"/);
  assert.match(source, /new Set\(\[[^\]]*CMS_MEDIA_HOST[^\]]*\]\)/);
  assert.match(source, /CMS_MEDIA_ORIGIN:\s*strapiUrl\.origin/);
});

test("a production-shaped R2 URL stays absolute on the media host", () => {
  const r2 = "https://media.mehdi-zare.com/claude_fable_5_2_pricing_breaking_changes_cover_c22cd82e6f.webp";
  assert.equal(toAbsoluteStrapiMediaUrl(r2, CMS_ORIGIN), r2);
  assert.equal(toAbsoluteStrapiMediaUrl(r2), r2);
  const prefixed = "https://media.mehdi-zare.com/media/claude_fable_5_2_pricing_breaking_changes_cover_c22cd82e6f.webp";
  assert.equal(toAbsoluteStrapiMediaUrl(prefixed, CMS_ORIGIN), prefixed);
});
