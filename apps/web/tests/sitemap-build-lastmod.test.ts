import test from "node:test";
import assert from "node:assert/strict";

process.env.DISABLE_STRAPI_CMS = "true";
process.env.BUILD_TIME = "2026-08-20T12:00:00.000Z";

const { default: sitemap, repoContentLastModified } = await import("../src/app/sitemap.ts");

// #113. The pages whose copy lives in the repo used to take their `lastmod`
// from CMS rows seeded in February and never edited. Dropping those reads left
// them on `new Date()` -- the moment the sitemap rendered, not the moment the
// page changed. Under a cached route that churned hourly; under a dynamic one it
// would churn per request.
//
// A `lastmod` of "always now" is the canonical unreliable signal, and Google
// discounts `lastmod` sitemap-wide once it decides a site's values cannot be
// trusted -- which would waste the accurate article-level timestamps too. The
// build that shipped the copy is the honest answer: stable for the life of a
// deploy, and it moves exactly when a deploy moves.

const REPO_OWNED = [
  "https://www.mehdi-zare.com",
  "https://www.mehdi-zare.com/about",
  "https://www.mehdi-zare.com/consulting",
  "https://www.mehdi-zare.com/ai-engineer",
  "https://www.mehdi-zare.com/contact",
];

function iso(value: Date | string | undefined): string | undefined {
  if (value instanceof Date) return value.toISOString();
  return value;
}

test("repo-owned pages report the build time, not the render time", async () => {
  const entries = await sitemap();

  for (const url of REPO_OWNED) {
    const entry = entries.find((candidate) => candidate.url === url);
    assert.ok(entry, `${url} must be in the sitemap`);
    assert.equal(
      iso(entry.lastModified),
      "2026-08-20T12:00:00.000Z",
      `${url} lastmod must come from BUILD_TIME, not from when the sitemap rendered`
    );
  }
});

test("two renders of the same build report the same lastmod", async () => {
  // The failure this rules out is subtle: every individual response looks
  // plausible, and only comparing two of them shows the value is a clock.
  const first = await sitemap();
  await new Promise((done) => setTimeout(done, 5));
  const second = await sitemap();

  for (const url of REPO_OWNED) {
    assert.equal(
      iso(first.find((entry) => entry.url === url)?.lastModified),
      iso(second.find((entry) => entry.url === url)?.lastModified),
      `${url} lastmod changed between two renders of the same build`
    );
  }
});

test("an absent or unparseable build stamp does not produce an invalid date", () => {
  const stamped = process.env.BUILD_TIME;
  try {
    for (const value of [undefined, "", "not a date"]) {
      if (value === undefined) delete process.env.BUILD_TIME;
      else process.env.BUILD_TIME = value;

      const resolved = repoContentLastModified();
      assert.ok(
        resolved instanceof Date && !Number.isNaN(resolved.getTime()),
        `BUILD_TIME=${String(value)} must still yield a valid Date, not Invalid Date`
      );
    }
  } finally {
    if (stamped === undefined) delete process.env.BUILD_TIME;
    else process.env.BUILD_TIME = stamped;
  }
});
