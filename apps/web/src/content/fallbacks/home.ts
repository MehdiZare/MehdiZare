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

export interface HomeWritingSource {
  title?: string | null;
  href: string;
  excerpt?: string | null;
  eyebrow?: string | null;
  meta?: string | null;
  external?: boolean;
}

export interface HomeWritingCard {
  key: string;
  title: string;
  href: string;
  excerpt?: string;
  eyebrow?: string;
  meta?: string;
  external: boolean;
}

export function buildHomeWritingCards(
  articles: HomeWritingSource[],
  fallbacks: HomeWritingSource[],
  limit = 3
): HomeWritingCard[] {
  const cards: HomeWritingCard[] = [];
  const seen = new Set<string>();

  for (const source of [...articles, ...fallbacks]) {
    if (cards.length >= limit) {
      break;
    }

    const title = source.title?.trim();
    const href = source.href?.trim();
    if (!title || !href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    cards.push({
      key: href,
      title,
      href,
      excerpt: source.excerpt?.trim() || undefined,
      eyebrow: source.eyebrow?.trim() || undefined,
      meta: source.meta?.trim() || undefined,
      external: Boolean(source.external),
    });
  }

  return cards;
}
