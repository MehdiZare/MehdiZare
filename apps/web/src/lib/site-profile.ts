import {
  CANONICAL_IDENTITY_ORIGIN,
  DEFAULT_SITE_PROFILE,
  DEFAULT_NAV_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from "./site-profile-defaults";
import { identityUrlKey, normalizeIdentityUrl } from "./url-normalization";
import { isBinaPrintEnabled } from "./feature-flags";
import { serverEnv } from "./server-env";
import { blankToUndefined } from "./strings";
import {
  resolveAuthorAddress,
  resolveAuthorAlumniOf,
  resolveAuthorWorksFor,
} from "./author-identity";
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

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => blankToUndefined(item))
    .filter((item): item is string => Boolean(item));
}

function normalizeNavItems(items: SiteSettings["navItems"]): NavItem[] {
  if (!Array.isArray(items)) {
    return filterHiddenNavItems(DEFAULT_NAV_ITEMS);
  }

  const normalized: NavItem[] = [];
  items.forEach((item, index) => {
    const label = blankToUndefined(item?.label);
    const href = blankToUndefined(item?.href);
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
      const platform = blankToUndefined(item?.platform);
      const url = blankToUndefined(item?.url);
      const normalizedUrl = normalizeIdentityUrl(url, CANONICAL_IDENTITY_ORIGIN);
      if (!platform || !normalizedUrl) {
        return null;
      }

      return {
        id: item.id ?? index + 1,
        platform,
        url: normalizedUrl,
      };
    })
    .filter((item): item is SocialLink => Boolean(item));

  return normalized.length > 0 ? normalized : DEFAULT_SOCIAL_LINKS;
}

function dedupeSocialLinks(items: SocialLink[]): SocialLink[] {
  const seen = new Set<string>();
  const deduped: SocialLink[] = [];

  items.forEach((item) => {
    const normalizedUrl = normalizeIdentityUrl(item.url, CANONICAL_IDENTITY_ORIGIN);
    if (!normalizedUrl) {
      return;
    }

    const key = identityUrlKey(normalizedUrl, CANONICAL_IDENTITY_ORIGIN);
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    deduped.push({
      ...item,
      url: normalizedUrl,
    });
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
          const platform = blankToUndefined(item?.platform);
          const normalizedUrl = normalizeIdentityUrl(
            blankToUndefined(item?.url),
            CANONICAL_IDENTITY_ORIGIN
          );

          if (!platform || !normalizedUrl) {
            return null;
          }

          return {
            id: item.id ?? index + 1,
            platform,
            url: normalizedUrl,
          };
        })
        .filter((item): item is SocialLink => Boolean(item))
    : [];

  const websiteUrl =
    normalizeIdentityUrl(blankToUndefined(author?.websiteUrl), CANONICAL_IDENTITY_ORIGIN) ??
    DEFAULT_SITE_PROFILE.authorWebsiteUrl;
  const linkedinUrl =
    normalizeIdentityUrl(blankToUndefined(author?.linkedinUrl), CANONICAL_IDENTITY_ORIGIN) ??
    DEFAULT_SITE_PROFILE.authorLinkedinUrl;

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
      const title = blankToUndefined(credential?.title);
      if (!title) {
        return null;
      }

      return {
        id: credential.id ?? index + 1,
        title,
        issuer: blankToUndefined(credential.issuer),
        description: blankToUndefined(credential.description),
        url: blankToUndefined(credential.url),
      };
    })
    .filter((credential): credential is Credential => credential !== null);
}

function deriveRole(author: Author | null | undefined, settings: SiteSettings | null | undefined): string {
  return (
    blankToUndefined(author?.jobTitle) ??
    blankToUndefined(author?.headline) ??
    blankToUndefined(settings?.authorRole) ??
    DEFAULT_SITE_PROFILE.authorRole
  );
}

function buildAuthorProfile(
  author: Author | null | undefined,
  settings: SiteSettings | null | undefined
): AuthorProfile {
  const fallbackSlug = DEFAULT_SITE_PROFILE.authorSlug;
  const slug = blankToUndefined(author?.slug) ?? fallbackSlug;
  const canonicalSocialLinks = buildCanonicalSocialLinks(author, settings?.socialLinks);
  const websiteUrl =
    normalizeIdentityUrl(blankToUndefined(author?.websiteUrl), CANONICAL_IDENTITY_ORIGIN) ??
    canonicalSocialLinks.find((link) => link.platform.toLowerCase() === "website")?.url ??
    DEFAULT_SITE_PROFILE.authorWebsiteUrl;
  const linkedinUrl =
    normalizeIdentityUrl(blankToUndefined(author?.linkedinUrl), CANONICAL_IDENTITY_ORIGIN) ??
    canonicalSocialLinks.find((link) => link.platform.toLowerCase() === "linkedin")?.url ??
    DEFAULT_SITE_PROFILE.authorLinkedinUrl;

  const knowsAbout = normalizeStringArray(author?.knowsAbout);

  return {
    id: author?.id,
    documentId: author?.documentId,
    name: blankToUndefined(author?.name) ?? blankToUndefined(settings?.authorName) ?? DEFAULT_SITE_PROFILE.authorName,
    slug,
    profilePath: `/author/${slug}`,
    headline: blankToUndefined(author?.headline),
    bioShort:
      blankToUndefined(author?.bioShort) ??
      blankToUndefined(settings?.authorBioShort) ??
      DEFAULT_SITE_PROFILE.authorBioShort,
    bioLong: author?.bioLong,
    websiteUrl,
    linkedinUrl,
    sameAs: canonicalSocialLinks,
    profileImage: author?.profileImage,
    jobTitle: deriveRole(author, settings),
    ...resolveAuthorWorksFor(
      { ...author, slug },
      {
        slug,
        worksForName: DEFAULT_SITE_PROFILE.authorWorksForName,
        worksForUrl: DEFAULT_SITE_PROFILE.authorWorksForUrl,
      }
    ),
    ...resolveAuthorAlumniOf(
      { ...author, slug },
      {
        slug,
        alumniOf: DEFAULT_SITE_PROFILE.authorAlumniOf,
      }
    ),
    knowsAbout: knowsAbout.length > 0 ? knowsAbout : [...DEFAULT_SITE_PROFILE.knowsAbout],
    credentials: normalizeCredentials(author?.credentials),
    // Delegated rather than repeated (#102). This resolved the three fields
    // independently, each with its own `?? DEFAULT_SITE_PROFILE` fallback, so a
    // record filling only some of them inherited the rest and published a
    // mixed address -- `Berlin, FL, DE` from a single cleared field. Sharing
    // the resolver with `/author/[slug]` is also what stops the two from
    // drifting apart again, which is the whole point of #92 and #98.
    ...resolveAuthorAddress(
      { ...author, slug },
      {
        slug,
        addressLocality: DEFAULT_SITE_PROFILE.authorAddressLocality,
        addressRegion: DEFAULT_SITE_PROFILE.authorAddressRegion,
        addressCountry: DEFAULT_SITE_PROFILE.authorAddressCountry,
      }
    ),
  };
}

function hasValidNavItems(items: SiteSettings["navItems"]): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some(
    (item) => Boolean(blankToUndefined(item?.label)) && Boolean(blankToUndefined(item?.href))
  );
}

function hasValidSocialLinks(items: SiteSettings["socialLinks"]): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some(
    (item) =>
      Boolean(blankToUndefined(item?.platform)) &&
      Boolean(normalizeIdentityUrl(blankToUndefined(item?.url), CANONICAL_IDENTITY_ORIGIN))
  );
}

function hasCanonicalAuthorData(author: Author | null | undefined): boolean {
  return Boolean(
    blankToUndefined(author?.name) &&
      deriveRole(author, undefined) &&
      blankToUndefined(author?.bioShort)
  );
}

function hasCanonicalSocialData(author: Author | null | undefined): boolean {
  const hasWebsite = Boolean(
    normalizeIdentityUrl(blankToUndefined(author?.websiteUrl), CANONICAL_IDENTITY_ORIGIN)
  );
  const hasLinkedIn = Boolean(
    normalizeIdentityUrl(blankToUndefined(author?.linkedinUrl), CANONICAL_IDENTITY_ORIGIN)
  );

  if (hasWebsite && hasLinkedIn) {
    return true;
  }

  if (!Array.isArray(author?.sameAs) || author.sameAs.length === 0) {
    return false;
  }

  return author.sameAs.some(
    (item) =>
      Boolean(blankToUndefined(item?.platform)) &&
      Boolean(normalizeIdentityUrl(blankToUndefined(item?.url), CANONICAL_IDENTITY_ORIGIN))
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
      return !blankToUndefined(settings.authorName) && !blankToUndefined(author?.name);
    }

    if (field === "authorRole") {
      return !blankToUndefined(settings.authorRole) && !blankToUndefined(author?.jobTitle) && !blankToUndefined(author?.headline);
    }

    if (field === "authorBioShort") {
      return !blankToUndefined(settings.authorBioShort) && !blankToUndefined(author?.bioShort);
    }

    return !blankToUndefined(settings[field as RequiredSiteProfileField]);
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
    siteName: blankToUndefined(settings?.siteName) ?? DEFAULT_SITE_PROFILE.siteName,
    siteDescription:
      blankToUndefined(settings?.siteDescription) ?? DEFAULT_SITE_PROFILE.siteDescription,
    positioningHeadline:
      blankToUndefined(settings?.positioningHeadline) ??
      DEFAULT_SITE_PROFILE.positioningHeadline,
    positioningSubheadline:
      blankToUndefined(settings?.positioningSubheadline) ??
      DEFAULT_SITE_PROFILE.positioningSubheadline,
    positioningHighlight:
      blankToUndefined(settings?.positioningHighlight) ??
      DEFAULT_SITE_PROFILE.positioningHighlight,
    credentialLine:
      blankToUndefined(settings?.credentialLine) ?? DEFAULT_SITE_PROFILE.credentialLine,
    industriesLine:
      blankToUndefined(settings?.industriesLine) ?? DEFAULT_SITE_PROFILE.industriesLine,
    locationLine:
      blankToUndefined(settings?.locationLine) ?? DEFAULT_SITE_PROFILE.locationLine,
    primaryCtaLabel:
      blankToUndefined(settings?.primaryCtaLabel) ?? DEFAULT_SITE_PROFILE.primaryCtaLabel,
    primaryCtaHref:
      blankToUndefined(settings?.primaryCtaHref) ?? DEFAULT_SITE_PROFILE.primaryCtaHref,
    secondaryCtaLabel:
      blankToUndefined(settings?.secondaryCtaLabel) ?? DEFAULT_SITE_PROFILE.secondaryCtaLabel,
    secondaryCtaHref:
      blankToUndefined(settings?.secondaryCtaHref) ?? DEFAULT_SITE_PROFILE.secondaryCtaHref,
    contactPrompt:
      blankToUndefined(settings?.contactPrompt) ?? DEFAULT_SITE_PROFILE.contactPrompt,
    authorName: canonicalAuthor.name,
    authorRole: canonicalAuthor.jobTitle,
    authorBioShort: canonicalAuthor.bioShort,
    footerText: blankToUndefined(settings?.footerText) ?? DEFAULT_SITE_PROFILE.footerText,
    bookCallHref:
      blankToUndefined(settings?.bookCallHref) ?? DEFAULT_SITE_PROFILE.bookCallHref,
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
