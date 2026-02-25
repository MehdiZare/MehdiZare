import test from "node:test";
import assert from "node:assert/strict";

const { default: robots } = await import("../src/app/robots.ts");

test("robots route exposes canonical host and sitemap", () => {
  const result = robots();

  assert.equal(result.host, "https://www.mehdi-zare.com");
  assert.equal(result.sitemap, "https://www.mehdi-zare.com/sitemap.xml");

  const primaryRule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  assert.ok(primaryRule);
  assert.equal(primaryRule.userAgent, "*");
  assert.equal(primaryRule.allow, "/");
  assert.deepEqual(primaryRule.disallow, ["/api/"]);
});
