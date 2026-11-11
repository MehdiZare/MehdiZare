import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// The sitemap contract, read off the build that ships rather than off source
// text (#152). Next 16.4's adapter turns a prerendered `/sitemap.xml` into a
// never-expiring static file on Vercel (vercel/next.js#99055), so the sitemap
// must be an ISR prerender at /sitemap-main.xml that /sitemap.xml rewrites to.
// Runs after `next build` -- see the `test:postbuild` script.

const NEXT_DIR = resolve(import.meta.dirname, "../../.next");

function readJson(name: string) {
  const file = resolve(NEXT_DIR, name);
  assert.ok(existsSync(file), `${file} is missing: run \`pnpm --filter=web build\` first`);
  return JSON.parse(readFileSync(file, "utf8"));
}

interface Rewrite {
  source: string;
  destination: string;
}

test("the built routes rewrite /sitemap.xml to the sitemap route", () => {
  const { rewrites } = readJson("routes-manifest.json") as {
    rewrites: Rewrite[] | { beforeFiles: Rewrite[]; afterFiles: Rewrite[]; fallback: Rewrite[] };
  };
  const all = Array.isArray(rewrites) ? rewrites : [...rewrites.beforeFiles, ...rewrites.afterFiles, ...rewrites.fallback];
  assert.ok(
    all.some((rule) => rule.source === "/sitemap.xml" && rule.destination === "/sitemap-main.xml"),
    "robots.txt, llms.txt and Search Console all point at /sitemap.xml"
  );
});

test("the sitemap route is an ISR prerender with a five-minute window, and /sitemap.xml is not prerendered", () => {
  const { routes } = readJson("prerender-manifest.json") as {
    routes: Record<string, { initialRevalidateSeconds: number | false; srcRoute: string | null }>;
  };
  assert.equal(routes["/sitemap-main.xml"]?.initialRevalidateSeconds, 300);
  assert.equal(routes["/sitemap-main.xml"]?.srcRoute, "/sitemap-main.xml");
  assert.equal(
    routes["/sitemap.xml"],
    undefined,
    "a prerendered /sitemap.xml is exactly what the adapter freezes into a static file"
  );
});

test("the built sitemap carries the path tag the publish webhook invalidates, and is XML", () => {
  const meta = JSON.parse(readFileSync(resolve(NEXT_DIR, "server/app/sitemap-main.xml.meta"), "utf8")) as {
    headers: Record<string, string>;
  };
  const tags = meta.headers["x-next-cache-tags"].split(",");
  // The webhook's typeless revalidatePath("/sitemap-main.xml") target. (The
  // `strapi` tag appears only when the build actually fetched from Strapi; CI
  // builds with the CMS disabled, so it is not asserted here.)
  assert.ok(tags.includes("_N_T_/sitemap-main.xml"), "revalidatePath('/sitemap-main.xml') target");
  assert.match(meta.headers["content-type"], /^application\/xml/);

  const body = readFileSync(resolve(NEXT_DIR, "server/app/sitemap-main.xml.body"), "utf8");
  assert.match(body, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.match(body, /<loc>https:\/\/www\.mehdi-zare\.com\/blog<\/loc>/);
});
