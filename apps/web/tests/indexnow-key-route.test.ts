import test from "node:test";
import assert from "node:assert/strict";

const { GET: getIndexNowKey, INDEXNOW_KEY } = await import(
  "../src/app/indexnow-key.txt/route.ts"
);

test("indexnow-key.txt returns the public ownership token as plain text", async () => {
  const response = await getIndexNowKey();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");

  const body = await response.text();
  assert.equal(body, INDEXNOW_KEY);
  assert.equal(body.includes("<"), false);
  assert.match(INDEXNOW_KEY, /^[A-Za-z0-9-]{8,128}$/);
});
