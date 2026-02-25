import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";

const { proxy } = await import("../src/proxy.ts");

test("proxy redirects legacy blog query pagination to static path segments", () => {
  const request = new NextRequest("https://www.mehdi-zare.com/blog?page=3");
  const response = proxy(request);

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://www.mehdi-zare.com/blog/page/3");
});

test("proxy canonicalizes /blog?page=1 to /blog", () => {
  const request = new NextRequest("https://www.mehdi-zare.com/blog?page=1");
  const response = proxy(request);

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://www.mehdi-zare.com/blog");
});
