/**
 * RSS feed constants, with no imports on purpose.
 *
 * `lib/feed.ts` pulls in `lib/strapi` (and through it `server-only`) and
 * `lib/seo`, so `lib/seo.ts` importing it for the `<link rel="alternate">`
 * would be an import cycle and drag the CMS client into every module that
 * builds page metadata. The root layout and `buildPageMetadata` read the
 * alternate from here instead; `lib/feed.ts` re-exports these.
 *
 * `FEED_TITLE` repeats `DEFAULT_SITE_PROFILE.siteName` as a literal to keep
 * this module import-free; `tests/feed-route.test.ts` pins the two together.
 */

export const FEED_PATH = "/feed.xml";
export const FEED_TITLE = "Mehdi Zare | Blog";

/**
 * `<link rel="alternate" type="application/rss+xml">` in the Next
 * `alternates.types` shape. Spread into `alternates.types` by the root layout
 * and by `buildPageMetadata`, which replaces the layout's `alternates` on every
 * page that calls it, so both must carry it.
 */
export const FEED_ALTERNATE_TYPES = {
  "application/rss+xml": [{ url: FEED_PATH, title: FEED_TITLE }],
};
