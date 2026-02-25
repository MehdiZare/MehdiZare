import {
  DEFAULT_SITE_PROFILE,
  DEFAULT_NAV_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from "./site-profile-defaults";
import { isBinaPrintEnabled } from "./feature-flags";
import { serverEnv } from "./server-env";
import type {
  Author,
  Credential,
  NavItem,
  SEO,
  SiteSettings,
  SocialLink,
  StrapiImage,
} from "../types/strapi";

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

interface AuthorProfile {
  id?: number;
  documentId?: string;
  name: string;
  slug: string;
  profilePath: string;
  headline?: string;
  bioShort: string;
  bioLong?: import("../types/strapi").BlocksContent;
  websiteUrl: string;
  linkedinUrl: string;
  sameAs: SocialLink[];
  profileImage?: StrapiImage;
  jobTitle: string;
  worksForName?: string;
  worksForUrl?: string;
  alumniOf: string[];
  knowsAbout: string[];
  credentials: Credential[];
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

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
  author: AuthorProfile;
  defaultSeo?: SEO;
}

interface SiteProfileOptions {
  strict?: boolean;
  author?: Author | null;
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter((item): item is string => Boolean(item));
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

function dedupeSocialLinks(items: SocialLink[]): SocialLink[] {
  const seen = new Set<string>();
  const deduped: SocialLink[] = [];

  items.forEach((item) => {
    const key = item.url.trim().toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push(item);
  });

  return deduped;
}

function buildCanonicalSocialLinks(
  author: Author | null | undefined,
  fallbackLinks: SiteSettings["socialLinks"]
): SocialLink[] {
  const normalizedAuthorLinks = Array.isArray(author?.sameAs)
    ? author.sameAs
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
        .filter((item): item is SocialLink => Boolean(item))
    : [];

  const websiteUrl =
    normalizeString(author?.websiteUrl) ?? DEFAULT_SITE_PROFILE.authorWebsiteUrl;
  const linkedinUrl =
    normalizeString(author?.linkedinUrl) ?? DEFAULT_SITE_PROFILE.authorLinkedinUrl;

  const canonical = dedupeSocialLinks([
    { id: 1, platform: "Website", url: websiteUrl },
    { id: 2, platform: "LinkedIn", url: linkedinUrl },
    ...normalizedAuthorLinks,
    ...normalizeSocialLinks(fallbackLinks),
  ]);

  return canonical.length > 0 ? canonical : DEFAULT_SOCIAL_LINKS;
}

function normalizeCredentials(credentials: Author["credentials"]): Credential[] {
  if (!Array.isArray(credentials)) {
    return [];
  }

  return credentials
    .map((credential, index): Credential | null => {
      const title = normalizeString(credential?.title);
      if (!title) {
        return null;
      }

      return {
        id: credential.id ?? index + 1,
        title,
        issuer: normalizeString(credential.issuer),
        description: normalizeString(credential.description),
        url: normalizeString(credential.url),
      };
    })
    .filter((credential): credential is Credential => credential !== null);
}

function deriveRole(author: Author | null | undefined, settings: SiteSettings | null | undefined): string {
  return (
    normalizeString(author?.jobTitle) ??
    normalizeString(author?.headline) ??
    normalizeString(settings?.authorRole) ??
    DEFAULT_SITE_PROFILE.authorRole
  );
}

function buildAuthorProfile(
  author: Author | null | undefined,
  settings: SiteSettings | null | undefined
): AuthorProfile {
  const fallbackSlug = DEFAULT_SITE_PROFILE.authorSlug;
  const slug = normalizeString(author?.slug) ?? fallbackSlug;
  const canonicalSocialLinks = buildCanonicalSocialLinks(author, settings?.socialLinks);
  const websiteUrl =
    normalizeString(author?.websiteUrl) ??
    canonicalSocialLinks.find((link) => link.platform.toLowerCase() === "website")?.url ??
    DEFAULT_SITE_PROFILE.authorWebsiteUrl;
  const linkedinUrl =
    normalizeString(author?.linkedinUrl) ??
    canonicalSocialLinks.find((link) => link.platform.toLowerCase() === "linkedin")?.url ??
    DEFAULT_SITE_PROFILE.authorLinkedinUrl;

  const knowsAbout = normalizeStringArray(author?.knowsAbout);
  const alumniOf = normalizeStringArray(author?.alumniOf);

  return {
    id: author?.id,
    documentId: author?.documentId,
    name: normalizeString(author?.name) ?? normalizeString(settings?.authorName) ?? DEFAULT_SITE_PROFILE.authorName,
    slug,
    profilePath: `/author/${slug}`,
    headline: normalizeString(author?.headline),
    bioShort:
      normalizeString(author?.bioShort) ??
      normalizeString(settings?.authorBioShort) ??
      DEFAULT_SITE_PROFILE.authorBioShort,
    bioLong: author?.bioLong,
    websiteUrl,
    linkedinUrl,
    sameAs: canonicalSocialLinks,
    profileImage: author?.profileImage,
    jobTitle: deriveRole(author, settings),
    worksForName:
      normalizeString(author?.worksForName) ?? DEFAULT_SITE_PROFILE.authorWorksForName,
    worksForUrl:
      normalizeString(author?.worksForUrl) ?? DEFAULT_SITE_PROFILE.authorWorksForUrl,
    alumniOf: alumniOf.length > 0 ? alumniOf : [...DEFAULT_SITE_PROFILE.authorAlumniOf],
    knowsAbout: knowsAbout.length > 0 ? knowsAbout : [...DEFAULT_SITE_PROFILE.knowsAbout],
    credentials: normalizeCredentials(author?.credentials),
    addressLocality: normalizeString(author?.addressLocality),
    addressRegion: normalizeString(author?.addressRegion),
    addressCountry: normalizeString(author?.addressCountry),
  };
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

function hasCanonicalAuthorData(author: Author | null | undefined): boolean {
  return Boolean(
    normalizeString(author?.name) &&
      deriveRole(author, undefined) &&
      normalizeString(author?.bioShort)
  );
}

function hasCanonicalSocialData(author: Author | null | undefined): boolean {
  const hasWebsite = Boolean(normalizeString(author?.websiteUrl));
  const hasLinkedIn = Boolean(normalizeString(author?.linkedinUrl));

  if (hasWebsite && hasLinkedIn) {
    return true;
  }

  if (!Array.isArray(author?.sameAs) || author.sameAs.length === 0) {
    return false;
  }

  return author.sameAs.some(
    (item) => Boolean(normalizeString(item?.platform)) && Boolean(normalizeString(item?.url))
  );
}

function collectMissingRequiredFields(
  settings: SiteSettings | null | undefined,
  author?: Author | null
): string[] {
  if (!settings) {
    let missing = [...REQUIRED_SITE_PROFILE_FIELDS, "navItems", "socialLinks"];

    if (hasCanonicalAuthorData(author)) {
      missing = missing.filter(
        (field) => field !== "authorName" && field !== "authorRole" && field !== "authorBioShort"
      );
    }

    if (hasCanonicalSocialData(author)) {
      missing = missing.filter((field) => field !== "socialLinks");
    }

    return missing;
  }

  const missing: string[] = REQUIRED_SITE_PROFILE_FIELDS.filter((field) => {
    if (field === "authorName") {
      return !normalizeString(settings.authorName) && !normalizeString(author?.name);
    }

    if (field === "authorRole") {
      return !normalizeString(settings.authorRole) && !normalizeString(author?.jobTitle) && !normalizeString(author?.headline);
    }

    if (field === "authorBioShort") {
      return !normalizeString(settings.authorBioShort) && !normalizeString(author?.bioShort);
    }

    return !normalizeString(settings[field as RequiredSiteProfileField]);
  });

  if (!hasValidNavItems(settings.navItems)) {
    missing.push("navItems");
  }

  if (!hasValidSocialLinks(settings.socialLinks) && !hasCanonicalSocialData(author)) {
    missing.push("socialLinks");
  }

  return missing;
}

function resolveStrictMode(explicit?: boolean): boolean {
  if (typeof explicit === "boolean") {
    return explicit;
  }

  if (serverEnv.strapiDisabled) {
    return false;
  }

  return process.env.SITE_PROFILE_STRICT === "true";
}

function mergeProfile(settings: SiteSettings | null | undefined, author?: Author | null): SiteProfile {
  const canonicalAuthor = buildAuthorProfile(author, settings);

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
    authorName: canonicalAuthor.name,
    authorRole: canonicalAuthor.jobTitle,
    authorBioShort: canonicalAuthor.bioShort,
    footerText: normalizeString(settings?.footerText) ?? DEFAULT_SITE_PROFILE.footerText,
    bookCallHref:
      normalizeString(settings?.bookCallHref) ?? DEFAULT_SITE_PROFILE.bookCallHref,
    knowsAbout: [...canonicalAuthor.knowsAbout],
    navItems: normalizeNavItems(settings?.navItems),
    socialLinks: [...canonicalAuthor.sameAs],
    author: canonicalAuthor,
    defaultSeo: settings?.defaultSeo,
  };
}

export function normalizeSiteProfile(
  settings: SiteSettings | null | undefined,
  options: SiteProfileOptions = {}
): SiteProfile {
  const strict = resolveStrictMode(options.strict);

  if (strict) {
    const missingFields = collectMissingRequiredFields(settings, options.author);
    if (missingFields.length > 0) {
      throw new SiteProfileValidationError(
        `Site Profile is missing required fields: ${missingFields.join(", ")}`,
        missingFields
      );
    }
  }

  if (options.author) {
    return mergeProfile(settings, options.author);
  }

  return mergeProfile(settings);
}

export async function getSiteProfile(options: SiteProfileOptions = {}): Promise<SiteProfile> {
  const strict = resolveStrictMode(options.strict);

  try {
    const { getPrimaryAuthor, getSiteSettings } = await import("./strapi");

    const [settingsResponse, author] = await Promise.all([
      getSiteSettings(),
      getPrimaryAuthor().catch(() => undefined),
    ]);

    return normalizeSiteProfile(settingsResponse.data, {
      strict,
      author: author ?? options.author,
    });
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
    return mergeProfile(undefined, options.author);
  }
}

export { DEFAULT_SITE_PROFILE, REQUIRED_SITE_PROFILE_FIELDS };
