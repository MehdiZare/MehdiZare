import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve, sep } from "node:path";

// vercel/next.js#99055: Next 16.4's build adapter emits a prerendered route as a
// plain static file when `isStaticMetadataFile(route)` matches, and never looks
// at its `revalidate`. On Vercel that file is served forever (`pathType:
// static` in the request log): no timer, no `revalidatePath`. That froze the
// live sitemap at the last deploy's data. This pins the workaround: every
// route that asks for ISR lives at a path the adapter check does not match,
// and /sitemap.xml reaches the sitemap through a rewrite.

const require = createRequire(import.meta.url);
const { isStaticMetadataFile } = require("next/dist/lib/metadata/is-metadata-route.js") as {
  isStaticMetadataFile: (route: string) => boolean;
};

const APP_DIR = resolve(process.cwd(), "src/app");
const ROUTE_FILE = /^(route|sitemap|robots|manifest)\.(ts|tsx|js|mjs)$/;

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return ROUTE_FILE.test(entry.name) ? [full] : [];
  });
}

/** `src/app/(group)/sitemap-main.xml/route.ts` -> `/sitemap-main.xml`; `src/app/robots.ts` -> `/robots.txt`. */
function routePathOf(file: string): string {
  const segments = relative(APP_DIR, file).split(sep).filter((segment) => !/^\(.*\)$/.test(segment));
  const name = segments.pop() ?? "";
  const base = name.replace(/\.(ts|tsx|js|mjs)$/, "");
  if (base === "sitemap") segments.push("sitemap.xml");
  if (base === "robots") segments.push("robots.txt");
  if (base === "manifest") segments.push("manifest.webmanifest");
  return `/${segments.join("/")}`;
}

test("the adapter check still matches /sitemap.xml (so the workaround is still needed) and not our route", () => {
  // If this first assertion fails, Next changed the matcher: re-check #99056
  // and consider moving the sitemap back to app/sitemap.ts.
  assert.equal(isStaticMetadataFile("/sitemap.xml"), true);
  assert.equal(isStaticMetadataFile("/sitemap-main.xml"), false);
});

test("no route that sets revalidate sits at a path the adapter emits as a static file", () => {
  const offenders = routeFiles(APP_DIR).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    if (!/export const revalidate\s*=\s*\d/.test(source)) return [];
    const route = routePathOf(file);
    return isStaticMetadataFile(route) ? [`${relative(process.cwd(), file)} -> ${route}`] : [];
  });
  assert.deepEqual(
    offenders,
    [],
    "These routes ask for ISR but Next 16.4's adapter ships them as never-expiring static files on Vercel (vercel/next.js#99055)."
  );
});

test("there is no app/sitemap.ts metadata route competing with the rewrite", () => {
  for (const name of ["sitemap.ts", "sitemap.tsx", "sitemap.js"]) {
    assert.equal(existsSync(join(APP_DIR, name)), false, `src/app/${name} would be emitted as a static file; use app/sitemap-main.xml/route.ts`);
  }
  assert.equal(existsSync(join(APP_DIR, "sitemap.xml")), false);
});

test("/sitemap.xml rewrites to the sitemap route handler", () => {
  // next.config.ts is CommonJS-flavoured (it uses __dirname), so it cannot be
  // imported under the ESM test runner; read the rule from the source instead.
  const config = readFileSync(resolve(process.cwd(), "next.config.ts"), "utf8");
  assert.match(config, /async rewrites\(\)/, "next.config must define rewrites()");
  assert.match(
    config,
    /\{\s*source:\s*"\/sitemap\.xml",\s*destination:\s*"\/sitemap-main\.xml"\s*\}/,
    "robots.txt, llms.txt and Search Console all point at /sitemap.xml"
  );
});
