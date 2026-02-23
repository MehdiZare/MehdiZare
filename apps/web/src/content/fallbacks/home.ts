import type { StrapiImage } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export interface HomeFallbackData {
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
  heroImage: StrapiImage | undefined;
}

export function buildHomeFallback(siteProfile: SiteProfile): HomeFallbackData {
  return {
    heroHeadline: siteProfile.positioningHeadline,
    heroSubheadline: siteProfile.positioningSubheadline,
    heroPrimaryCtaLabel: siteProfile.primaryCtaLabel,
    heroPrimaryCtaHref: siteProfile.primaryCtaHref,
    heroSecondaryCtaLabel: siteProfile.secondaryCtaLabel,
    heroSecondaryCtaHref: siteProfile.secondaryCtaHref,
    heroImage: undefined,
  };
}

export function splitIndustries(industriesLine: string): string[] {
  const parsed = industriesLine
    .split(/[|·,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : ["Finance", "Defense", "Healthcare", "Enterprise"];
}
