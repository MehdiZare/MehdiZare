// `.js`: next/constants has no package exports map, so plain Node ESM (the
// test runner) needs the file path; the bundler resolves it the same way.
// `next build` sets NEXT_PHASE to PHASE_PRODUCTION_BUILD.
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";
import { buildSitemap } from "@/lib/sitemap";
import { serializeSitemap } from "@/lib/sitemap-xml";

/**
 * The sitemap, served at `/sitemap.xml` through a rewrite in next.config.ts.
 *
 * Why not `app/sitemap.ts`: in Next 16.4 the build adapter emits any prerendered
 * route whose path ends in `/sitemap.xml` as a plain static file, ignoring its
 * `revalidate` (vercel/next.js#99055; fix pending in #99056). On Vercel that
 * file never regenerates -- not on the five-minute timer and not on
 * `revalidatePath` from the publish webhook -- so the live sitemap stayed frozen
 * at whatever the last deploy built. A route handler at `/sitemap.xml` is
 * matched the same way, so this one lives at a path the check does not match
 * (`tests/sitemap-isr-guard.test.ts` pins that) and is a normal ISR prerender,
 * like `/feed.xml`.
 *
 * Bounded ISR, not `force-dynamic`. `revalidate = 3600` let a published post
 * sit out of the sitemap for up to an hour (#110); five minutes closes that
 * while keeping the response cacheable. A dynamic sitemap would be one
 * uncached, four-way paginated Strapi walk per crawler hit (#118).
 *
 * On publish, the webhook's typeless `revalidatePath("/sitemap-main.xml")` and
 * `revalidateTag("strapi")` both reach this route.
 *
 * Once a Next release ships #99056 this can go back to `app/sitemap.ts`, keeping
 * the degraded-regeneration rule below.
 */
export const revalidate = 300;
/** Isolate budget: must exceed SITEMAP_DEADLINE_MS so a slow CMS walk can still return the fallback. */
export const maxDuration = 20;


/**
 * A degraded result (CMS down, slow or partial) is served only when there is
 * no earlier copy to keep: the build. At runtime a successful 200 would become
 * the cached sitemap and drop every article URL until the next good
 * regeneration, so a degraded regeneration throws instead and ISR keeps
 * serving the last complete sitemap (owner decision on #152).
 */
class DegradedSitemapError extends Error {
  readonly degradedSources: string[];

  constructor(degradedSources: string[]) {
    super(`[sitemap] degraded regeneration (${degradedSources.join(", ")}); keeping the cached sitemap`);
    this.name = "DegradedSitemapError";
    this.degradedSources = degradedSources;
  }
}

/** Renders the sitemap XML; throws on a degraded runtime regeneration (see DegradedSitemapError). */
export async function GET(): Promise<Response> {
  const { entries, degradedSources } = await buildSitemap();
  if (degradedSources.length > 0 && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    throw new DegradedSitemapError(degradedSources);
  }
  return new Response(serializeSitemap(entries), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
