import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { buildCsp, buildReportingEndpoints, posthogAssetsOrigin, CAL_ORIGINS } =
  await import("../src/lib/csp.ts");

const SITE = "https://www.mehdi-zare.com";
const PROXY = "https://t.mehdi-zare.com";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    })
  );
}

function policy(overrides = {}) {
  return buildCsp({ siteOrigin: SITE, posthogOrigin: PROXY, ...overrides });
}

test("PostHog is allowed only on the directives it actually uses", () => {
  const parsed = directives(policy());

  // Observed on a production page load: the SDK and the recorder/survey/
  // web-vitals bundles are scripts, config and ingest are fetches.
  assert.ok(parsed.get("script-src")?.includes(PROXY));
  assert.ok(parsed.get("connect-src")?.includes(PROXY));

  // Nothing PostHog loads is audio or video.
  assert.ok(!parsed.get("media-src")?.includes(PROXY));
  assert.ok(!parsed.get("frame-src")?.includes(PROXY));
});

test("no wildcard host ever reaches the policy", () => {
  // A host wildcard is a plain suffix match, so `https://*.posthog.com` would
  // silently re-admit every PostHog subdomain that routing the traffic through
  // the first-party proxy was meant to remove.
  assert.doesNotMatch(policy(), /\*/);
});

test("only the configured PostHog origin is allowed", () => {
  const parsed = directives(policy());

  for (const name of ["script-src", "connect-src", "img-src"]) {
    const sources = parsed.get(name) ?? [];
    assert.deepEqual(
      sources.filter((source) => source.includes("posthog")),
      [],
      `${name} should reach PostHog through the proxy, not a posthog.com origin`
    );
  }
});

test("a PostHog-hosted origin also allows the assets origin it loads from", () => {
  // posthog-js resolves /array/<token>/config.js and the recorder, survey,
  // dead-click and web-vitals bundles against a sibling assets host, not
  // against api_host. Allowing only api_host blocks all of them.
  const parsed = directives(policy({ posthogOrigin: "https://us.i.posthog.com" }));

  for (const name of ["script-src", "connect-src"]) {
    assert.ok(parsed.get(name)?.includes("https://us.i.posthog.com"), name);
    assert.ok(parsed.get(name)?.includes("https://us-assets.i.posthog.com"), name);
  }

  assert.ok(!policy({ posthogOrigin: "https://us.i.posthog.com" }).includes(PROXY));

  const hosted = "https://us.i.posthog.com";
  const hostedAssets = "https://us-assets.i.posthog.com";
  const hostedPolicy = directives(policy({ posthogOrigin: hosted }));
  assert.ok(hostedPolicy.get("img-src")?.includes(hosted));
  assert.ok(!hostedPolicy.get("img-src")?.includes(hostedAssets));
  assert.ok(!hostedPolicy.get("media-src")?.includes(hosted));
  assert.ok(!hostedPolicy.get("media-src")?.includes(hostedAssets));
  assert.ok(!hostedPolicy.get("frame-src")?.includes(hosted));
  assert.doesNotMatch(policy({ posthogOrigin: hosted }), /\*/);
});

test("the assets origin is derived per region, and not at all for a proxy", () => {
  assert.equal(posthogAssetsOrigin("https://us.i.posthog.com"), "https://us-assets.i.posthog.com");
  assert.equal(posthogAssetsOrigin("https://eu.i.posthog.com"), "https://eu-assets.i.posthog.com");
  assert.equal(posthogAssetsOrigin("https://app.posthog.com"), "https://us-assets.i.posthog.com");
  assert.equal(posthogAssetsOrigin("https://us.posthog.com"), "https://us-assets.i.posthog.com");
  // A first-party proxy serves assets and ingest itself.
  assert.equal(posthogAssetsOrigin(PROXY), null);
  // Not a PostHog origin at all, and not one a lookalike domain can claim.
  assert.equal(posthogAssetsOrigin("https://us.i.posthog.com.evil.test"), null);
  assert.equal(posthogAssetsOrigin("https://evil-posthog.com"), null);
});

test("routing through the proxy keeps the policy to a single PostHog origin", () => {
  const parsed = directives(policy());

  for (const name of ["script-src", "connect-src", "img-src"]) {
    const posthogSources = (parsed.get(name) ?? []).filter((source) =>
      source.includes("posthog") || source === PROXY
    );
    assert.deepEqual(posthogSources, [PROXY], name);
  }
});

test("Cal.com keeps the origins its embed needs", () => {
  const parsed = directives(policy());

  // Pin the constant itself: iterating an empty CAL_ORIGINS would pass.
  assert.deepEqual([...CAL_ORIGINS], ["https://cal.com", "https://app.cal.com"]);

  // getCalApi() injects a script from app.cal.com and then opens an iframe.
  for (const origin of CAL_ORIGINS) {
    assert.ok(parsed.get("script-src")?.includes(origin), `script-src ${origin}`);
    assert.ok(parsed.get("connect-src")?.includes(origin), `connect-src ${origin}`);
    assert.ok(parsed.get("frame-src")?.includes(origin), `frame-src ${origin}`);
  }
});

test("img-src covers every origin next/image is configured to fetch", () => {
  const imageOrigins = ["https://cdn.example.com", "https://cms.example.com"];
  const parsed = directives(policy({ imageOrigins }));

  for (const origin of imageOrigins) {
    assert.ok(parsed.get("img-src")?.includes(origin));
  }
});

test("the baseline hardening directives stay put", () => {
  const parsed = directives(policy());

  assert.deepEqual(parsed.get("default-src"), ["'self'"]);
  assert.deepEqual(parsed.get("frame-ancestors"), ["'none'"]);
  assert.deepEqual(parsed.get("object-src"), ["'none'"]);
  assert.deepEqual(parsed.get("base-uri"), ["'self'"]);
  assert.deepEqual(parsed.get("form-action"), ["'self'"]);
  // PostHog's session recorder builds its compression worker from a blob URL.
  assert.deepEqual(parsed.get("worker-src"), ["'self'", "blob:"]);
  // Next's inline bootstrap still needs these; removing them blanks production.
  assert.ok(parsed.get("script-src")?.includes("'unsafe-inline'"));
  assert.ok(parsed.get("style-src")?.includes("'unsafe-inline'"));
  assert.deepEqual(parsed.get("media-src"), ["'self'", "data:", "blob:"]);
});

test("violations are reported through both the legacy and Reporting API paths", () => {
  const parsed = directives(policy({ reportPath: "/api/csp-report" }));

  // Firefox and Safari only implement report-uri; Chrome only report-to.
  assert.deepEqual(parsed.get("report-uri"), ["/api/csp-report"]);
  assert.deepEqual(parsed.get("report-to"), ["csp-endpoint"]);
  assert.equal(
    buildReportingEndpoints("/api/csp-report"),
    'csp-endpoint="/api/csp-report"'
  );
});

test("reporting directives are omitted when no collector is configured", () => {
  const bare = policy();

  assert.ok(!bare.includes("report-uri"));
  assert.ok(!bare.includes("report-to"));
});

test("upgrade-insecure-requests is production only", () => {
  assert.ok(policy({ isProduction: true }).includes("upgrade-insecure-requests"));
  assert.ok(!policy({ isProduction: false }).includes("upgrade-insecure-requests"));
});

test("next.config.ts ships buildCsp with image origins and reporting", () => {
  const source = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  assert.match(source, /from "\.\/src\/lib\/csp"/);
  assert.match(source, /buildCsp\(/);
  assert.match(source, /imageOrigins:\s*cspImageOrigins/);
  assert.match(source, /reportPath:\s*CSP_REPORT_PATH/);
  assert.match(source, /buildReportingEndpoints\(CSP_REPORT_PATH\)/);
  assert.match(source, /cspImageOrigins = imageRemotePatterns\.map/);
});

test("buildCsp refuses wildcard hosts", () => {
  assert.throws(
    () => policy({ posthogOrigin: "https://*.posthog.com" }),
    /Illegal CSP source/
  );
});

test("the joined header is a single well-formed policy", () => {
  const header = policy({ reportPath: "/api/csp-report", isProduction: true });

  assert.ok(!header.includes(";;"));
  assert.ok(!header.includes("  "));
  assert.ok(!header.endsWith(";"));
  for (const [name, sources] of directives(header)) {
    assert.match(name, /^[a-z-]+$/);
    assert.equal(new Set(sources).size, sources.length, `${name} repeats a source`);
  }
});
