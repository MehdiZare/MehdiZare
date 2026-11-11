import buildSitemap from "@/lib/sitemap";
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
 * CMS outages: a regeneration while Strapi is down, slow or partial returns
 * the fallback (static pages plus data/taxonomy.json, possibly without
 * articles) as a normal 200, and ISR caches it until the next regeneration
 * after Strapi recovers. That is accepted (owner decision on #152): a sitemap
 * missing posts for a while does not deindex them, while failing the
 * regeneration to keep the previous copy turned into 500s after a publish
 * (revalidatePath expires the entry, so the regeneration blocks) and depends on
 * Vercel keeping the stale copy.
 *
 * On publish, the webhook's typeless `revalidatePath("/sitemap-main.xml")` and
 * `revalidateTag("strapi")` both reach this route.
 *
 * Once a Next release ships #99056 this can go back to `app/sitemap.ts`.
 */
export const revalidate = 300;
/** Isolate budget: must exceed SITEMAP_DEADLINE_MS so a slow CMS walk can still return the fallback. */
export const maxDuration = 20;

/** Renders the sitemap XML; always 200, with the fallback when the CMS is unavailable. */
export async function GET(): Promise<Response> {
  return new Response(serializeSitemap(await buildSitemap()), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
