import type { NavItem } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export function normalizeBenefits(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const values = input.filter((item): item is string => typeof item === "string");
  return values.length > 0 ? values : fallback;
}

export const fallbackBenefits = [
  "1 production AI teardown",
  "1 domain lesson from a high-stakes team",
  "1 actionable framework",
];

export const fallbackArchiveLinks: NavItem[] = [
  { id: 1, label: "Archive coming soon", href: "/newsletter" },
];

export interface NewsletterFallbackData {
  headline: string;
  subheadline: string;
  socialProofText: string;
  benefits: string[];
  archiveLinks: NavItem[];
}

export function buildNewsletterFallback(siteProfile: SiteProfile): NewsletterFallbackData {
  return {
    headline: siteProfile.newsletterTitle,
    subheadline: siteProfile.newsletterOneLiner,
    socialProofText:
      "Built for engineering leaders, operators, and AI teams shipping real systems.",
    benefits: fallbackBenefits,
    archiveLinks: fallbackArchiveLinks,
  };
}
