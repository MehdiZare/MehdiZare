import test from "node:test";
import assert from "node:assert/strict";

const { GET: getLlmsTxt } = await import("../src/app/llms.txt/route.ts");
const { GET: getWellKnownLlmsTxt } = await import("../src/app/.well-known/llms.txt/route.ts");

test("llms.txt route returns text content with canonical host and sitemap", async () => {
  const response = await getLlmsTxt();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");

  const body = await response.text();
  assert.match(body, /canonical_host:\s+https:\/\/www\.mehdi-zare\.com/);
  assert.match(body, /sitemap:\s+https:\/\/www\.mehdi-zare\.com\/sitemap\.xml/);
  assert.match(body, /https:\/\/www\.mehdi-zare\.com\/ai-engineer/);
});

test(".well-known llms.txt route mirrors main llms.txt content", async () => {
  const [primary, wellKnown] = await Promise.all([getLlmsTxt(), getWellKnownLlmsTxt()]);
  assert.equal(wellKnown.status, 200);
  assert.equal(await wellKnown.text(), await primary.text());
});

