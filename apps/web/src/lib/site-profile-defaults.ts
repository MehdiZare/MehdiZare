import type { NavItem, SocialLink } from "../types/strapi";

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 1, label: "About", href: "/about", order: 1, external: false },
  { id: 2, label: "Writing", href: "/blog", order: 2, external: false },
];

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { id: 1, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
  { id: 2, platform: "GitHub", url: "https://github.com/mehdizare" },
  { id: 3, platform: "Medium", url: "https://medium.com/@mehdi-zare" },
  { id: 4, platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
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
  locationLine: "Arlington, VA",
  primaryCtaLabel: "Let's Talk",
  primaryCtaHref: "/consulting#book",
  secondaryCtaLabel: "How I work",
  secondaryCtaHref: "/about",
  contactPrompt: "Working on an AI initiative that needs to ship?",
  authorName: "Mehdi Zare, CFA",
  authorRole: "Principal AI Engineer",
  authorBioShort:
    "Principal AI engineer shipping production systems across finance, defense, healthcare, and enterprise.",
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
