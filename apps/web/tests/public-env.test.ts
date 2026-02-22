import test from "node:test";
import assert from "node:assert/strict";
const { toAbsoluteStrapiMediaUrl } = await import("../src/lib/public-env.ts");

test("toAbsoluteStrapiMediaUrl keeps absolute urls unchanged", () => {
  const url = toAbsoluteStrapiMediaUrl("https://cdn.example.com/image.png");
  assert.equal(url, "https://cdn.example.com/image.png");
});

test("toAbsoluteStrapiMediaUrl resolves relative paths against Strapi origin", () => {
  const url = toAbsoluteStrapiMediaUrl("/uploads/image.png");
  assert.ok(url.includes("/uploads/image.png"));
});
