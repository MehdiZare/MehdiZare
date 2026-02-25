import test from "node:test";
import assert from "node:assert/strict";
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
