import type { NavItem, SocialLink } from "../types/strapi";

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 1, label: "About", href: "/about", order: 1, external: false },
  { id: 2, label: "Writing", href: "/blog", order: 2, external: false },
];

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: 1, platform: "Website", url: "https://www.mehdi-zare.com" },
  { id: 2, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
  { id: 3, platform: "GitHub", url: "https://github.com/mehdizare" },
  { id: 4, platform: "Medium", url: "https://medium.com/@mehdi-zare" },
  { id: 5, platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
];

export const DEFAULT_SITE_PROFILE = {
  siteName: "Mehdi Zare",
  siteDescription:
    "Principal AI Engineer who ships production AI systems across finance, defense, healthcare, and enterprise. From prototype to production.",
  positioningHeadline: "I take AI from prototype to production.",
  positioningSubheadline:
    "Most AI projects stall between demo and deployment. I'm the engineer who gets them across that gap — because I learn your domain before I write a line of code.",
  positioningHighlight: "because I learn your domain before I write a line of code.",
  credentialLine: "Principal AI Engineer · CFA Charterholder",
  industriesLine: "Finance · Defense · Healthcare · Enterprise",
  locationLine: "Miami, FL",
  primaryCtaLabel: "Let's Talk",
  primaryCtaHref: "/consulting#book",
  secondaryCtaLabel: "How I work",
  secondaryCtaHref: "/about",
  contactPrompt: "Working on an AI initiative that needs to ship?",
  authorName: "Mehdi Zare, CFA",
  authorRole: "Principal AI Engineer",
  authorBioShort:
    "Principal AI engineer shipping production systems across finance, defense, healthcare, and enterprise.",
  authorSlug: "mehdi-zare",
  authorWebsiteUrl: "https://www.mehdi-zare.com",
  authorLinkedinUrl: "https://linkedin.com/in/mehdizare",
  authorAddressLocality: "Miami",
  authorAddressRegion: "FL",
  authorAddressCountry: "US",
  authorWorksForName: "Entarian",
  authorWorksForUrl: "https://entarian.com",
  authorAlumniOf: [
    "University of Maryland, Smith School of Business",
    "University of Tehran",
  ],
  footerText: "© Mehdi Zare",
  bookCallHref: "/consulting#book",
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Financial Analysis",
    "Quantitative Finance",
    "AI Engineering",
  ],
  navItems: DEFAULT_NAV_ITEMS,
  socialLinks: DEFAULT_SOCIAL_LINKS,
} as const;

export type DefaultSiteProfile = typeof DEFAULT_SITE_PROFILE;

/**
 * The one origin every Person surface canonicalizes identity URLs against.
 *
 * Declared here, in the leaf both `site-profile.ts` and `author-identity.ts`
 * already import, because it previously existed twice under this exact name
 * with two different sources (#103): `getSiteUrl()` in `author-identity.ts`
 * and `DEFAULT_SITE_PROFILE.authorWebsiteUrl` here. The same Person was
 * therefore canonicalized against a different origin depending on which
 * surface rendered them -- and since the root layout emits its Person on
 * *every* route, `/author/[slug]` and `/blog/[slug]` consumed both at once.
 *
 * Pinned to `authorWebsiteUrl` rather than to `NEXT_PUBLIC_SITE_URL` on
 * purpose. This value is triple-guarded -- `site-identity-consistency.test.ts`
 * compares it across `data/taxonomy.json`, the seed and these defaults --
 * whereas the env var is guarded by nothing and is the *deployment* origin. On
 * a preview deployment the two differ, which would stop the apex/www folding in
 * `normalizeIdentityUrl` from recognising the site's own links.
 */
export const CANONICAL_IDENTITY_ORIGIN = DEFAULT_SITE_PROFILE.authorWebsiteUrl;
