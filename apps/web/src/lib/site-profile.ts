import {
  CANONICAL_IDENTITY_ORIGIN,
  DEFAULT_SITE_PROFILE,
  DEFAULT_NAV_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from "./site-profile-defaults";
import { identityUrlKey, normalizeIdentityUrl } from "./url-normalization";
import { isBinaPrintEnabled } from "./feature-flags";
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

function filterHiddenNavItems(items: NavItem[]): NavItem[] {
  if (isBinaPrintEnabled()) {
    return items;
  }

  return items.filter((item) => !item.href.startsWith("/bina-print"));
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

function buildCanonicalSocialLinks(author: Author | null | undefined): SocialLink[] {
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
    ...DEFAULT_SOCIAL_LINKS,
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

function deriveRole(author: Author | null | undefined): string {
  return (
    blankToUndefined(author?.jobTitle) ??
    blankToUndefined(author?.headline) ??
    DEFAULT_SITE_PROFILE.authorRole
  );
}

function buildAuthorProfile(author: Author | null | undefined): AuthorProfile {
  const fallbackSlug = DEFAULT_SITE_PROFILE.authorSlug;
  const slug = blankToUndefined(author?.slug) ?? fallbackSlug;
  const canonicalSocialLinks = buildCanonicalSocialLinks(author);
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
    name: blankToUndefined(author?.name) ?? DEFAULT_SITE_PROFILE.authorName,
    slug,
    profilePath: `/author/${slug}`,
    headline: blankToUndefined(author?.headline),
    bioShort:
      blankToUndefined(author?.bioShort) ?? DEFAULT_SITE_PROFILE.authorBioShort,
    bioLong: author?.bioLong,
    websiteUrl,
    linkedinUrl,
    sameAs: canonicalSocialLinks,
    profileImage: author?.profileImage,
    jobTitle: deriveRole(author),
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

function collectMissingRequiredFields(author?: Author | null): string[] {
  const profile = mergeProfile(author);
  const missing: string[] = [];

  for (const field of REQUIRED_SITE_PROFILE_FIELDS) {
    const value = profile[field];
    if (typeof value !== "string" || !value.trim()) {
      missing.push(field);
    }
  }

  if (profile.navItems.length === 0) {
    missing.push("navItems");
  }

  if (profile.socialLinks.length === 0) {
    missing.push("socialLinks");
  }

  return missing;
}

/**
 * Repo defaults plus the CMS author record. Site settings are not a source:
 * `getSiteProfile` stopped reading `site-setting` in #100, and #116 stopped
 * seeding that row. Collapsing the merge makes that unrepresentable -- a
 * `settings?.x ?? DEFAULT` chain cannot quietly start winning again.
 */
function mergeProfile(author?: Author | null): SiteProfile {
  const canonicalAuthor = buildAuthorProfile(author);

  return {
    siteName: DEFAULT_SITE_PROFILE.siteName,
    siteDescription: DEFAULT_SITE_PROFILE.siteDescription,
    positioningHeadline: DEFAULT_SITE_PROFILE.positioningHeadline,
    positioningSubheadline: DEFAULT_SITE_PROFILE.positioningSubheadline,
    positioningHighlight: DEFAULT_SITE_PROFILE.positioningHighlight,
    credentialLine: DEFAULT_SITE_PROFILE.credentialLine,
    industriesLine: DEFAULT_SITE_PROFILE.industriesLine,
    locationLine: DEFAULT_SITE_PROFILE.locationLine,
    primaryCtaLabel: DEFAULT_SITE_PROFILE.primaryCtaLabel,
    primaryCtaHref: DEFAULT_SITE_PROFILE.primaryCtaHref,
    secondaryCtaLabel: DEFAULT_SITE_PROFILE.secondaryCtaLabel,
    secondaryCtaHref: DEFAULT_SITE_PROFILE.secondaryCtaHref,
    contactPrompt: DEFAULT_SITE_PROFILE.contactPrompt,
    authorName: canonicalAuthor.name,
    authorRole: canonicalAuthor.jobTitle,
    authorBioShort: canonicalAuthor.bioShort,
    footerText: DEFAULT_SITE_PROFILE.footerText,
    bookCallHref: DEFAULT_SITE_PROFILE.bookCallHref,
    knowsAbout: [...canonicalAuthor.knowsAbout],
    navItems: filterHiddenNavItems([...DEFAULT_NAV_ITEMS]),
    socialLinks: [...canonicalAuthor.sameAs],
    author: canonicalAuthor,
  };
}

export function normalizeSiteProfile(options: SiteProfileOptions = {}): SiteProfile {
  // Strict validation is opt-in per call, never ambient. It used to also turn
  // on from `SITE_PROFILE_STRICT=true` against a CMS `site-setting` row.
  // Defaults fill every required field by construction, so `strict` now
  // checks the resolved profile -- a way to notice a default going blank --
  // and cannot be turned on from outside.
  if (options.strict === true) {
    const missingFields = collectMissingRequiredFields(options.author);
    if (missingFields.length > 0) {
      throw new SiteProfileValidationError(
        `Site Profile is missing required fields: ${missingFields.join(", ")}`,
        missingFields
      );
    }
  }

  return mergeProfile(options.author);
}

export async function getSiteProfile(options: SiteProfileOptions = {}): Promise<SiteProfile> {
  try {
    const { getPrimaryAuthor } = await import("./strapi");

    // Page copy and site identity are repo-owned. The author record still
    // comes from Strapi: articles relate to it, and `/author/[slug]` renders
    // it raw.
    const author = await getPrimaryAuthor().catch(() => undefined);

    return normalizeSiteProfile({
      author: author ?? options.author,
    });
  } catch (error) {
    console.warn(
      "⚠ CMS author unavailable — site profile falling back to default content.",
      error instanceof Error ? error.message : error
    );
    return mergeProfile(options.author);
  }
}

export { DEFAULT_SITE_PROFILE, REQUIRED_SITE_PROFILE_FIELDS };
