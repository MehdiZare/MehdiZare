import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

// Behavioural coverage for the Strapi publish webhook (#115). Source contracts
// in revalidate-route.test.ts pin the silent-type bug that cannot be loaded
// here without a next/cache stub; this file is the loadable half.
//
// serverEnv freezes REVALIDATE_SECRET at import, so this file always has a
// secret. The unconfigured (500) path is revalidate-route-unconfigured.test.ts.

process.env.REVALIDATE_SECRET = "test-revalidate-secret";
process.env.DISABLE_STRAPI_CMS = "true";

const { POST } = await import("../src/app/api/revalidate/route.ts");
const {
  revalidatePathCalls,
  revalidateTagCalls,
  resetRevalidateCalls,
}: {
  revalidatePathCalls: Array<{ path: string; type?: string }>;
  revalidateTagCalls: Array<{ tag: string; profile?: string }>;
  resetRevalidateCalls: () => void;
} = await import("./next-cache-stub.mjs");

beforeEach(() => {
  resetRevalidateCalls();
});

function request(init: {
  secretIn?: "query" | "header" | "body" | "none" | "authorization";
  secret?: string;
  body?: unknown;
  rawBody?: string;
}): Request {
  const secret = init.secret ?? "test-revalidate-secret";
  const url = new URL("https://www.mehdi-zare.com/api/revalidate");
  const headers = new Headers({ "content-type": "application/json" });

  if (init.secretIn === "query") {
    url.searchParams.set("secret", secret);
  }
  if (init.secretIn === "header") {
    headers.set("x-revalidate-secret", secret);
  }
  if (init.secretIn === "authorization") {
    headers.set("authorization", `Bearer ${secret}`);
  }

  let body: string | undefined;
  if (init.rawBody !== undefined) {
    body = init.rawBody;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
  } else if (init.secretIn === "body") {
    body = JSON.stringify({ secret });
  }

  return new Request(url, { method: "POST", headers, body });
}

async function post(init: Parameters<typeof request>[0]) {
  const response = await POST(request(init));
  const json = (await response.json()) as Record<string, unknown>;
  return { status: response.status, json };
}

test("401 when the secret is missing", async () => {
  const { status, json } = await post({ secretIn: "none" });
  assert.equal(status, 401);
  assert.equal(json.ok, false);
  assert.equal(revalidateTagCalls.length, 0);
  assert.equal(revalidatePathCalls.length, 0);
});

test("401 when the secret is wrong", async () => {
  const { status } = await post({ secretIn: "header", secret: "nope" });
  assert.equal(status, 401);
  assert.equal(revalidateTagCalls.length, 0);
});

test("401 when the secret is supplied only on an unexpected channel", async () => {
  const { status } = await post({ secretIn: "authorization" });
  assert.equal(status, 401);
  assert.equal(revalidateTagCalls.length, 0);
});

test("header and query secrets are both accepted", async () => {
  const header = await post({ secretIn: "header" });
  assert.equal(header.status, 200);
  assert.equal(header.json.ok, true);

  resetRevalidateCalls();

  const query = await post({ secretIn: "query" });
  assert.equal(query.status, 200);
  assert.equal(query.json.ok, true);
});

test("body secret is accepted the same way as header and query", async () => {
  const { status, json } = await post({ secretIn: "body" });
  assert.equal(status, 200);
  assert.equal(json.ok, true);
});

test("a malformed or empty JSON body does not 500", async () => {
  const empty = await post({ secretIn: "query", rawBody: "" });
  assert.equal(empty.status, 200);

  resetRevalidateCalls();

  const malformed = await post({ secretIn: "header", rawBody: "{not-json" });
  assert.equal(malformed.status, 200);
});

test("revalidateTag(strapi, max) is called exactly once per accepted request", async () => {
  await post({ secretIn: "header" });
  assert.deepEqual(revalidateTagCalls, [{ tag: "strapi", profile: "max" }]);
});

test("collectPaths maps a Strapi article publish payload to the expected path set", async () => {
  const { json } = await post({
    secretIn: "header",
    body: {
      event: "entry.publish",
      model: "article",
      entry: { slug: "ssr-visibility-fixture" },
    },
  });

  const revalidated = json.revalidated as string[];
  for (const path of [
    "/",
    "/blog",
    "/sitemap.xml",
    "/robots.txt",
    "/author/[slug]",
    "/blog/[slug]",
    "/blog/page/[page]",
    "/blog/category/[slug]",
    "/blog/tag/[slug]",
    "/blog/ssr-visibility-fixture",
  ]) {
    assert.ok(revalidated.includes(path), `missing ${path}`);
  }
});

test("collectPaths maps category, tag, and author publish payloads to their canonical URLs", async () => {
  const category = await post({
    secretIn: "header",
    body: { model: "category", entry: { slug: "ai-engineering" } },
  });
  assert.ok(
    (category.json.revalidated as string[]).includes("/blog/category/ai-engineering")
  );

  resetRevalidateCalls();
  const tag = await post({
    secretIn: "header",
    body: { model: "tag", entry: { slug: "llms" } },
  });
  assert.ok((tag.json.revalidated as string[]).includes("/blog/tag/llms"));

  resetRevalidateCalls();
  const author = await post({
    secretIn: "header",
    body: { model: "author", entry: { slug: "mehdi-zare" } },
  });
  assert.ok((author.json.revalidated as string[]).includes("/author/mehdi-zare"));
});

test("bracketed dynamic paths take the page type; everything else is typeless", async () => {
  await post({ secretIn: "header" });

  const pageTyped = revalidatePathCalls
    .filter((call) => call.type === "page")
    .map((call) => call.path)
    .sort();
  const typeless = revalidatePathCalls
    .filter((call) => call.type === undefined)
    .map((call) => call.path)
    .sort();

  assert.deepEqual(pageTyped, [
    "/author/[slug]",
    "/blog/[slug]",
    "/blog/category/[slug]",
    "/blog/page/[page]",
    "/blog/tag/[slug]",
  ]);

  assert.ok(typeless.includes("/sitemap.xml"));
  assert.ok(typeless.includes("/"));
  assert.ok(typeless.includes("/blog"));
  assert.ok(!typeless.some((path) => path.includes("[") && path.includes("]")));
  assert.ok(!pageTyped.includes("/sitemap.xml"));
});
