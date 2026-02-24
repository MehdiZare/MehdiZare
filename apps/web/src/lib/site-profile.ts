import {
  DEFAULT_SITE_PROFILE,
  DEFAULT_NAV_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from "./site-profile-defaults";
import { isBinaPrintEnabled } from "./feature-flags";
import type { NavItem, SEO, SiteSettings, SocialLink } from "../types/strapi";

const REQUIRED_SITE_PROFILE_FIELDS = [
  "siteName",
  "siteDescription",
  "positioningHeadline",
  "positioningSubheadline",
  "positioningHighlight",
  "credentialLine",
  "industriesLine",
  "locationLine",
  "primaryCtaLabel",
  "primaryCtaHref",
  "secondaryCtaLabel",
  "secondaryCtaHref",
  "contactPrompt",
  "authorName",
  "authorRole",
  "authorBioShort",
  "footerText",
  "bookCallHref",
] as const;

type RequiredSiteProfileField = (typeof REQUIRED_SITE_PROFILE_FIELDS)[number];

export interface SiteProfile {
  siteName: string;
  siteDescription: string;
  positioningHeadline: string;
  positioningSubheadline: string;
  positioningHighlight: string;
  credentialLine: string;
  industriesLine: string;
  locationLine: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  contactPrompt: string;
  authorName: string;
  authorRole: string;
  authorBioShort: string;
  footerText: string;
  bookCallHref: string;
  knowsAbout: string[];
  navItems: NavItem[];
  socialLinks: SocialLink[];
  defaultSeo?: SEO;
}

interface SiteProfileOptions {
  strict?: boolean;
}

export class SiteProfileValidationError extends Error {
  readonly missingFields: string[];

  constructor(message: string, missingFields: string[]) {
    super(message);
    this.name = "SiteProfileValidationError";
    this.missingFields = missingFields;
  }
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeNavItems(items: SiteSettings["navItems"]): NavItem[] {
  if (!Array.isArray(items)) {
    return filterHiddenNavItems(DEFAULT_NAV_ITEMS);
  }

  const normalized: NavItem[] = [];
  items.forEach((item, index) => {
    const label = normalizeString(item?.label);
    const href = normalizeString(item?.href);
    if (!label || !href) {
      return;
    }

    normalized.push({
      id: item.id ?? index + 1,
      label,
      href,
      order: item.order,
      external: Boolean(item.external),
    });
  });

  normalized.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

  const visibleItems = filterHiddenNavItems(normalized);
  if (visibleItems.length > 0) {
    return visibleItems;
  }

  return filterHiddenNavItems(DEFAULT_NAV_ITEMS);
}

function filterHiddenNavItems(items: NavItem[]): NavItem[] {
  if (isBinaPrintEnabled()) {
    return items;
  }

  return items.filter((item) => !item.href.startsWith("/bina-print"));
}

function normalizeSocialLinks(items: SiteSettings["socialLinks"]): SocialLink[] {
  if (!Array.isArray(items)) {
    return DEFAULT_SOCIAL_LINKS;
  }

  const normalized = items
    .map((item, index) => {
      const platform = normalizeString(item?.platform);
      const url = normalizeString(item?.url);
      if (!platform || !url) {
        return null;
      }

      return {
        id: item.id ?? index + 1,
        platform,
        url,
      };
    })
    .filter((item): item is SocialLink => Boolean(item));

  return normalized.length > 0 ? normalized : DEFAULT_SOCIAL_LINKS;
}

function hasValidNavItems(items: SiteSettings["navItems"]): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some(
    (item) => Boolean(normalizeString(item?.label)) && Boolean(normalizeString(item?.href))
  );
}

function hasValidSocialLinks(items: SiteSettings["socialLinks"]): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some(
    (item) => Boolean(normalizeString(item?.platform)) && Boolean(normalizeString(item?.url))
  );
}

function collectMissingRequiredFields(settings: SiteSettings | null | undefined): string[] {
  if (!settings) {
    return [...REQUIRED_SITE_PROFILE_FIELDS, "navItems", "socialLinks"];
  }

  const missing: string[] = REQUIRED_SITE_PROFILE_FIELDS.filter(
    (field) => !normalizeString(settings[field as RequiredSiteProfileField])
  );

  if (!hasValidNavItems(settings.navItems)) {
    missing.push("navItems");
  }

  if (!hasValidSocialLinks(settings.socialLinks)) {
    missing.push("socialLinks");
  }

  return missing;
}

function isStrapiDisabled(): boolean {
  return (process.env.DISABLE_STRAPI_CMS ?? "false").toLowerCase() !== "false";
}

function resolveStrictMode(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") {
    return explicit;
  }

  if (isStrapiDisabled()) {
    return false;
  }

  return process.env.CI === "true" || process.env.SITE_PROFILE_STRICT === "true";
}

function mergeProfile(settings: SiteSettings | null | undefined): SiteProfile {
  return {
    siteName: normalizeString(settings?.siteName) ?? DEFAULT_SITE_PROFILE.siteName,
    siteDescription:
      normalizeString(settings?.siteDescription) ?? DEFAULT_SITE_PROFILE.siteDescription,
    positioningHeadline:
      normalizeString(settings?.positioningHeadline) ??
      DEFAULT_SITE_PROFILE.positioningHeadline,
    positioningSubheadline:
      normalizeString(settings?.positioningSubheadline) ??
      DEFAULT_SITE_PROFILE.positioningSubheadline,
    positioningHighlight:
      normalizeString(settings?.positioningHighlight) ??
      DEFAULT_SITE_PROFILE.positioningHighlight,
    credentialLine:
      normalizeString(settings?.credentialLine) ?? DEFAULT_SITE_PROFILE.credentialLine,
    industriesLine:
      normalizeString(settings?.industriesLine) ?? DEFAULT_SITE_PROFILE.industriesLine,
    locationLine:
      normalizeString(settings?.locationLine) ?? DEFAULT_SITE_PROFILE.locationLine,
    primaryCtaLabel:
      normalizeString(settings?.primaryCtaLabel) ?? DEFAULT_SITE_PROFILE.primaryCtaLabel,
    primaryCtaHref:
      normalizeString(settings?.primaryCtaHref) ?? DEFAULT_SITE_PROFILE.primaryCtaHref,
    secondaryCtaLabel:
      normalizeString(settings?.secondaryCtaLabel) ?? DEFAULT_SITE_PROFILE.secondaryCtaLabel,
    secondaryCtaHref:
      normalizeString(settings?.secondaryCtaHref) ?? DEFAULT_SITE_PROFILE.secondaryCtaHref,
    contactPrompt:
      normalizeString(settings?.contactPrompt) ?? DEFAULT_SITE_PROFILE.contactPrompt,
    authorName: normalizeString(settings?.authorName) ?? DEFAULT_SITE_PROFILE.authorName,
    authorRole: normalizeString(settings?.authorRole) ?? DEFAULT_SITE_PROFILE.authorRole,
    authorBioShort:
      normalizeString(settings?.authorBioShort) ?? DEFAULT_SITE_PROFILE.authorBioShort,
    footerText: normalizeString(settings?.footerText) ?? DEFAULT_SITE_PROFILE.footerText,
    bookCallHref:
      normalizeString(settings?.bookCallHref) ?? DEFAULT_SITE_PROFILE.bookCallHref,
    knowsAbout: [...DEFAULT_SITE_PROFILE.knowsAbout],
    navItems: normalizeNavItems(settings?.navItems),
    socialLinks: normalizeSocialLinks(settings?.socialLinks),
    defaultSeo: settings?.defaultSeo,
  };
}

export function normalizeSiteProfile(
  settings: SiteSettings | null | undefined,
  options: SiteProfileOptions = {}
): SiteProfile {
  const strict = resolveStrictMode(options.strict);

  if (strict) {
    const missingFields = collectMissingRequiredFields(settings);
    if (missingFields.length > 0) {
      throw new SiteProfileValidationError(
        `Site Profile is missing required fields: ${missingFields.join(", ")}`,
        missingFields
      );
    }
  }

  return mergeProfile(settings);
}

export async function getSiteProfile(options: SiteProfileOptions = {}): Promise<SiteProfile> {
  const strict = resolveStrictMode(options.strict);

  try {
    const { getSiteSettings } = await import("./strapi");
    const response = await getSiteSettings();
    return normalizeSiteProfile(response.data, { strict });
  } catch (error) {
    if (strict) {
      const message = error instanceof Error ? error.message : "unknown_error";
      throw new SiteProfileValidationError(
        `Unable to load Site Profile in strict mode: ${message}`,
        ["site-setting"]
      );
    }

    console.warn(
      "⚠ CMS unavailable — site profile falling back to default content.",
      error instanceof Error ? error.message : error
    );
    return mergeProfile(undefined);
  }
}

export { DEFAULT_SITE_PROFILE, REQUIRED_SITE_PROFILE_FIELDS };
