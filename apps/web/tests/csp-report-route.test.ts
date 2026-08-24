import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";

// The route only forwards to PostHog in production; Next types NODE_ENV as
// read-only, so it has to be set through the record type.
(process.env as Record<string, string>).NODE_ENV = "production";
process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://t.example.com";

const { POST } = await import("../src/app/api/csp-report/route.ts");

interface Captured {
  url: string;
  body: Record<string, unknown>;
}

let captured: Captured[] = [];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  captured.push({
    url: String(input),
    body: JSON.parse(String(init?.body ?? "{}")),
  });
  return new Response(null, { status: 200 });
}) as typeof fetch;

// The route holds its rate-limit window in module scope, and node:test runs a
// file's tests in one process. Without this, whichever test ran first would
// spend the budget and every later test would be answered by the rate limiter
// instead of the behaviour it names. Advancing past the window between tests
// gives each one a clean budget, and exercises the rollover while it is at it.
let clock = Date.UTC(2026, 0, 1);
Date.now = () => clock;

beforeEach(() => {
  clock += 61_000;
});

function report(body: Record<string, unknown>): Request {
  return new Request("https://www.mehdi-zare.com/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/reports+json" },
    body: JSON.stringify([{ type: "csp-violation", body }]),
  });
}

async function post(request: Request) {
  captured = [];
  const response = await POST(request);
  return { status: response.status, sent: captured };
}

test("forwards a Reporting API violation to PostHog", async () => {
  const { status, sent } = await post(
    report({
      documentURL: "https://www.mehdi-zare.com/",
      effectiveDirective: "connect-src",
      blockedURL: "https://us.i.posthog.com/e/",
      disposition: "enforce",
    })
  );

  assert.equal(status, 204);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.url, "https://t.example.com/i/v0/e/");
  assert.equal(sent[0]?.body.event, "csp_violation");

  const properties = sent[0]?.body.properties as Record<string, unknown>;
  assert.equal(properties.directive, "connect-src");
  assert.equal(properties.blocked_uri, "https://us.i.posthog.com/e/");
  // Violations are not a person, and must not create a profile.
  assert.equal(properties.$process_person_profile, false);
});

test("accepts the legacy application/csp-report body shape", async () => {
  const { status, sent } = await post(
    new Request("https://www.mehdi-zare.com/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({
        "csp-report": {
          "document-uri": "https://www.mehdi-zare.com/about",
          "violated-directive": "img-src 'self'",
          "blocked-uri": "https://cdn.example.com/a.png",
        },
      }),
    })
  );

  assert.equal(status, 204);
  assert.equal(sent.length, 1);
  const properties = sent[0]?.body.properties as Record<string, unknown>;
  assert.equal(properties.directive, "img-src");
  assert.equal(properties.violated_directive, "img-src 'self'");
});

test("drops violations caused by browser extensions", async () => {
  for (const blockedURL of [
    "chrome-extension://abcdef/inject.js",
    "moz-extension://abcdef/inject.js",
    "safari-web-extension://abcdef/inject.js",
    "about:blank",
  ]) {
    const { status, sent } = await post(
      report({ effectiveDirective: "script-src", blockedURL })
    );
    assert.equal(status, 204);
    assert.deepEqual(sent, [], `${blockedURL} should not be forwarded`);
  }
});

test("reports the same violation only once per window", async () => {
  const first = await post(
    report({ effectiveDirective: "font-src", blockedURL: "https://fonts.example/x.woff2" })
  );
  const second = await post(
    report({ effectiveDirective: "font-src", blockedURL: "https://fonts.example/x.woff2" })
  );

  assert.equal(first.sent.length, 1);
  assert.deepEqual(second.sent, [], "a repeat of the same violation is deduped");
});

test("the same violation is reported again in the next window", async () => {
  const violation = { effectiveDirective: "font-src", blockedURL: "https://fonts.example/y.woff2" };

  assert.equal((await post(report(violation))).sent.length, 1);
  assert.deepEqual((await post(report(violation))).sent, []);

  clock += 61_000;

  assert.equal(
    (await post(report(violation))).sent.length,
    1,
    "an ongoing violation should keep being visible, not be silenced forever"
  );
});

test("caps how many distinct violations one window forwards", async () => {
  let forwarded = 0;

  for (let i = 0; i < 200; i += 1) {
    const { sent } = await post(
      report({ effectiveDirective: "media-src", blockedURL: `https://flood.example/${i}` })
    );
    forwarded += sent.length;
  }

  assert.ok(forwarded > 0, "some reports get through");
  assert.ok(forwarded <= 60, `a report storm is capped, forwarded ${forwarded}`);
});

test("never fails the request on a malformed body", async () => {
  const { status, sent } = await post(
    new Request("https://www.mehdi-zare.com/api/csp-report", {
      method: "POST",
      body: "not json at all",
    })
  );

  assert.equal(status, 204);
  assert.deepEqual(sent, []);
});

test("never fails the request when PostHog is unreachable", async () => {
  const restore = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts += 1;
    throw new Error("network down");
  }) as typeof fetch;

  try {
    const response = await POST(
      report({ effectiveDirective: "style-src", blockedURL: "https://down.example/a.css" })
    );
    assert.equal(response.status, 204);
    // Load-bearing: without this the test passes even when the report is
    // dropped before it ever reaches the failing call it claims to guard.
    assert.equal(attempts, 1, "the forward should have been attempted and swallowed");
  } finally {
    globalThis.fetch = restore;
  }
});
