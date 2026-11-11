import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The Strapi publish webhook had no test of any kind, which is how a wrong
// `revalidatePath` type shipped through green CI.
//
// The type is not guessable, and getting it wrong fails silently -- the webhook
// still returns 200, nothing throws, and the content just never refreshes.
// The sitemap is a route handler at /sitemap-main.xml (/sitemap.xml rewrites to
// it; see that route for why). Like /feed.xml it registers
// `_N_T_/sitemap-main.xml` -- exactly what a *typeless* `revalidatePath` emits --
// and `_N_T_/sitemap-main.xml/route`, but never `_N_T_/sitemap-main.xml/page`.
// Passing `"page"` for it emits a tag nothing registers. A dynamic *page* route
// is the opposite case: `/blog/[slug]` registers `_N_T_/blog/[slug]/page`, so
// it does need the type.
//
// Source contract for the silent-type bug. Behavioural coverage of POST
// (auth, collectPaths, the two revalidatePath types) is in
// revalidate-route-behavior.test.ts, which loads the route through a
// next/cache stub (#115).

const source = readFileSync(resolve(process.cwd(), "src/app/api/revalidate/route.ts"), "utf8");

/** Everything from the last `if (` up to the page-typed call: the guard that selects it. */
function pageTypedGuard(): string {
  const call = source.indexOf('revalidatePath(path, "page")');
  assert.notEqual(call, -1, 'Expected a `revalidatePath(path, "page")` call in the revalidation loop.');
  const before = source.slice(0, call);
  return before.slice(before.lastIndexOf("if ("));
}

test("the page type is reserved for bracketed dynamic routes", () => {
  assert.match(
    pageTypedGuard(),
    /path\.includes\("\["\) && path\.includes\("\]"\)/,
    "the page-typed branch must be gated on a bracketed dynamic route"
  );
});

test("the sitemap is never revalidated with the page type", () => {
  // The exact regression this pins: `|| path === "/sitemap-main.xml"` added to the
  // page-typed branch. It reads as a fix and is the opposite of one.
  assert.doesNotMatch(
    pageTypedGuard(),
    /sitemap/,
    'A route handler registers `_N_T_/sitemap-main.xml`, never `_N_T_/sitemap-main.xml/page`. Routing the sitemap through the "page" branch emits a tag nothing registers, so a publish would silently never refresh the sitemap.'
  );
});

test("the webhook still revalidates the sitemap and the shared strapi tag", () => {
  // Without these, the assertions above would be satisfied by dropping sitemap
  // revalidation altogether.
  assert.match(source, /"\/sitemap-main\.xml"/, "the default path set must include the sitemap route");
  assert.match(
    source,
    /revalidateTag\("strapi", "max"\)/,
    "the shared strapi tag is what invalidates the CMS-backed fetch cache"
  );
  assert.match(
    source,
    /\} else \{\s*revalidatePath\(path\);/,
    "non-bracketed paths, including /sitemap-main.xml, must take the typeless call"
  );
});

test("the webhook rejects a request whose secret does not match", () => {
  assert.match(
    source,
    /providedSecret !== serverEnv\.revalidateSecret/,
    "the webhook is unauthenticated without this comparison"
  );
  assert.match(source, /status: 401/);
});
