import { DEFAULT_SITE_PROFILE } from "./site-profile-defaults";

/**
 * Brand colour tokens for surfaces that cannot read CSS variables, such as the
 * `next/og` image routes.
 *
 * These mirror the `--color-*` tokens in `src/app/globals.css`. The OG cards
 * used to carry their own near-miss palette (#f8f6f1, #1f2937, #8d6f3f), so a
 * shared card never quite matched the site it linked to. A change to either
 * side must change both; `og-image-brand.test.ts` pins the two together.
 */
export const BRAND_COLORS = {
  ink: "#0f0f0f",
  paper: "#fafaf8",
  warmGray: "#e8e6e1",
  midGray: "#6b6560",
  accentWarm: "#c4956a",
  muted: "#f4f3f0",
} as const;

/**
 * The domain printed on share cards, e.g. `mehdi-zare.com`.
 *
 * Derived from the guarded identity origin rather than `getSiteUrl()`, which
 * is the deployment origin and differs on previews. The card used to hard-code
 * `mehdizare.com`, a domain the site does not own.
 */
export const BRAND_DISPLAY_DOMAIN = new URL(
  DEFAULT_SITE_PROFILE.authorWebsiteUrl
).host.replace(/^www\./, "");
