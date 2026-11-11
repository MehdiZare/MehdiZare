import { DEFAULT_SITE_PROFILE } from "./site-profile-defaults";

/**
 * RSS feed constants that page metadata can import without pulling in
 * `lib/feed.ts`.
 *
 * That module pulls in `lib/strapi` (and through it `server-only`) and
 * `lib/seo`, so `lib/seo.ts` importing it for the `<link rel="alternate">`
 * would be an import cycle and drag the CMS client into every module that
 * builds page metadata. The root layout and `buildPageMetadata` read the
 * alternate from here instead; `lib/feed.ts` re-exports these.
 *
 * The title is the Site Profile name. `site-profile-defaults` has no runtime
 * imports, so this edge does not cycle back through `seo.ts`.
 */

export const FEED_PATH = "/feed.xml";
export const FEED_TITLE = `${DEFAULT_SITE_PROFILE.siteName} | Blog`;

/**
 * `<link rel="alternate" type="application/rss+xml">` in the Next
 * `alternates.types` shape. Spread into `alternates.types` by the root layout
 * and by `buildPageMetadata`, which replaces the layout's `alternates` on every
 * page that calls it, so both must carry it.
 */
export const FEED_ALTERNATE_TYPES = {
  "application/rss+xml": [{ url: FEED_PATH, title: FEED_TITLE }],
};
