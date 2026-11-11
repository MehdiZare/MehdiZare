import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

// TS-08 / GEO-12: the publish webhook submits changed post URLs to IndexNow
// after revalidating, fire and forget, and a failed or hung submission never
// fails the webhook. Own file: serverEnv freezes REVALIDATE_SECRET at import.
process.env.REVALIDATE_SECRET = "test-revalidate-secret";
process.env.DISABLE_STRAPI_CMS = "true";
process.env.VERCEL_ENV = "production";

const SITE = "https://www.mehdi-zare.com";

type Call = { url: string; init?: RequestInit };
const calls: Call[] = [];
let respond: () => Promise<Response> = async () => new Response(null, { status: 200 });

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ url: String(input), init });
  return respond();
}) as typeof fetch;

const { POST } = await import("../src/app/api/revalidate/route.ts");
const { INDEXNOW_KEY } = await import("../src/app/indexnow-key.txt/route.ts");
const {
  buildIndexNowUrls,
  isIndexNowEnabled,
  submitToIndexNow,
  INDEXNOW_ENDPOINT,
} = await import("../src/lib/indexnow.ts");
const { revalidateTagCalls, resetRevalidateCalls }: {
  revalidateTagCalls: Array<{ tag: string; profile?: string }>;
  resetRevalidateCalls: () => void;
} = await import("./next-cache-stub.mjs");

beforeEach(() => {
  calls.length = 0;
  resetRevalidateCalls();
  respond = async () => new Response(null, { status: 200 });
  process.env.VERCEL_ENV = "production";
});

function webhook(body: unknown): Request {
  return new Request(`${SITE}/api/revalidate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate-secret": "test-revalidate-secret",
    },
    body: JSON.stringify(body),
  });
}

/** Lets the detached submission (no request scope, so no `after`) run. */
async function settle() {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

test("an article publish submits the post and /blog to IndexNow with the served key", async () => {
  const response = await POST(
    webhook({ event: "entry.publish", model: "article", entry: { slug: "new-post" } })
  );
  assert.equal(response.status, 200);
  await settle();

  const submissions = calls.filter((call) => call.url === INDEXNOW_ENDPOINT);
  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(submissions[0].init?.body)), {
    host: "www.mehdi-zare.com",
    key: INDEXNOW_KEY,
    // The key is not at /<key>.txt, so keyLocation is required.
    keyLocation: `${SITE}/indexnow-key.txt`,
    urlList: [`${SITE}/blog/new-post`, `${SITE}/blog`],
  });
  assert.ok(submissions[0].init?.signal, "the submission carries its own timeout");
});

test("revalidation happens before, and independently of, the submission", async () => {
  respond = async () => {
    throw new Error("network down");
  };
  const response = await POST(
    webhook({ event: "entry.unpublish", model: "article", entry: { slug: "gone" } })
  );
  assert.equal(response.status, 200, "a failed submission never fails the webhook");
  assert.deepEqual(revalidateTagCalls, [{ tag: "strapi", profile: "max" }]);
  await settle();
  assert.equal(calls.length, 1);
});

test("the webhook does not wait for a slow IndexNow answer", async () => {
  let release: (value: Response) => void = () => {};
  respond = () => new Promise<Response>((resolve) => {
    release = resolve;
  });
  const response = await POST(
    webhook({ event: "entry.publish", model: "article", entry: { slug: "slow" } })
  );
  assert.equal(response.status, 200);
  release(new Response(null, { status: 200 }));
  await settle();
});

test("draft saves, other models, missing slugs and non-production deployments submit nothing", async () => {
  for (const body of [
    { event: "entry.update", model: "article", entry: { slug: "draft-save" } },
    { event: "entry.create", model: "article", entry: { slug: "draft" } },
    { event: "entry.publish", model: "category", entry: { slug: "ai-engineering" } },
    { event: "entry.publish", model: "article", entry: {} },
    { event: "entry.publish", model: "article", entry: { slug: "a/b" } },
  ]) {
    await POST(webhook(body));
  }

  process.env.VERCEL_ENV = "preview";
  await POST(webhook({ event: "entry.publish", model: "article", entry: { slug: "preview" } }));

  await settle();
  assert.deepEqual(calls, []);
});

test("a noindex entry (the box, or metaRobots noindex/none) is not submitted, but is still revalidated", async () => {
  for (const entry of [
    { slug: "ticked", noindex: true },
    { slug: "robots-noindex", seo: { metaRobots: "NOINDEX, follow" } },
    { slug: "robots-none", seo: { metaRobots: "none" } },
    { slug: "both", noindex: true, seo: { metaRobots: "index, follow" } },
  ]) {
    resetRevalidateCalls();
    const response = await POST(webhook({ event: "entry.publish", model: "article", entry }));
    assert.equal(response.status, 200, entry.slug);
    assert.deepEqual(revalidateTagCalls, [{ tag: "strapi", profile: "max" }], `${entry.slug} still revalidates`);
  }
  await settle();
  assert.deepEqual(calls, [], "no IndexNow submission for a noindex post");
});

test("an indexable entry is submitted, and a malformed noindex/seo does not break the webhook", async () => {
  for (const entry of [
    // `none` inside another directive's value is not the `none` directive.
    { slug: "preview-none", seo: { metaRobots: "index, follow, max-image-preview:none" } },
    { slug: "unticked", noindex: false, seo: { metaRobots: null } },
    { slug: "junk", noindex: "true", seo: { metaRobots: 42 } },
    { slug: "junk-seo", seo: "noindex" },
  ]) {
    calls.length = 0;
    const response = await POST(webhook({ event: "entry.publish", model: "article", entry }));
    assert.equal(response.status, 200, entry.slug);
    await settle();
    assert.equal(
      calls.filter((call) => call.url === INDEXNOW_ENDPOINT).length,
      1,
      `${entry.slug} is submitted`
    );
  }
});

test("isIndexNowEnabled only answers yes for the production deployment", () => {
  assert.equal(isIndexNowEnabled({ VERCEL_ENV: "production" }), true);
  assert.equal(isIndexNowEnabled({ VERCEL_ENV: "preview" }), false);
  assert.equal(isIndexNowEnabled({}), false);
});

test("buildIndexNowUrls covers publish, unpublish and delete for articles only", () => {
  for (const event of ["entry.publish", "entry.unpublish", "entry.delete"]) {
    assert.deepEqual(
      buildIndexNowUrls({ event, model: "article", encodedSlug: "x", siteUrl: SITE }),
      [`${SITE}/blog/x`, `${SITE}/blog`]
    );
  }
  assert.deepEqual(buildIndexNowUrls({ event: "entry.update", model: "article", encodedSlug: "x" }), []);
  assert.deepEqual(buildIndexNowUrls({ event: "entry.publish", model: "tag", encodedSlug: "x" }), []);
  assert.deepEqual(buildIndexNowUrls({ event: "entry.publish", model: "article", encodedSlug: null }), []);
});

test("submitToIndexNow reports a rejected submission as false without throwing", async () => {
  const fetchImpl = (async () =>
    new Response("bad key", { status: 403, statusText: "Forbidden" })) as typeof fetch;
  assert.equal(await submitToIndexNow([`${SITE}/blog/x`], { fetchImpl, siteUrl: SITE }), false);

  const timeout = (async (_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    })) as typeof fetch;
  assert.equal(
    await submitToIndexNow([`${SITE}/blog/x`], { fetchImpl: timeout, siteUrl: SITE, timeoutMs: 10 }),
    false,
    "a hung endpoint is cut off by the timeout"
  );

  assert.equal(await submitToIndexNow([], { siteUrl: SITE }), false, "nothing to submit");
});
