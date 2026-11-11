import type { Metadata } from "next";
import type { SEO, StrapiImage } from "../types/strapi";
import { publicEnv, toAbsoluteStrapiMediaUrl } from "./public-env";
import { DEFAULT_SITE_PROFILE } from "./site-profile-defaults";
import { blankToUndefined } from "./strings";

const DEFAULT_SITE_URL = "https://www.mehdi-zare.com";

export const SITE_NAME = DEFAULT_SITE_PROFILE.siteName;
export const PERSON_NAME = DEFAULT_SITE_PROFILE.siteName;
export const PERSON_TITLE = DEFAULT_SITE_PROFILE.credentialLine;
export const DEFAULT_SITE_DESCRIPTION = DEFAULT_SITE_PROFILE.siteDescription;

/**
 * The site owner's X account. Every post ships an X version, so shares are
 * attributed through `twitter:site` / `twitter:creator`, and the profile is in
 * Person `sameAs` (and `DEFAULT_SOCIAL_LINKS`) so the account ties back to the
 * site entity.
 */
export const X_HANDLE = "@mehdizare";
export const X_PROFILE_URL = "https://x.com/mehdizare";

// The site's own URL is deliberately absent: it is the Person's `url`, and
// `sameAs` is for *other* pages that identify the same person.
export const PERSON_SAME_AS = [
  "https://linkedin.com/in/mehdizare",
  "https://github.com/mehdizare",
  "https://medium.com/@mehdi-zare",
  "https://seekingalpha.com/author/mehdi-zare",
  X_PROFILE_URL,
];

// Q141251494 is the Wikidata item for the *site* ("personal website of Mehdi
// Zare…"), not a person biography, so it belongs on the WebSite node and never
// in PERSON_SAME_AS (#137).
export const WEBSITE_SAME_AS = [
  "https://www.wikidata.org/wiki/Q141251494",
];

export const DEFAULT_KNOWS_ABOUT = [
  "Artificial Intelligence",
  "Machine Learning",
  "Financial Analysis",
  "Quantitative Finance",
  "AI Engineering",
];

/**
 * Snippet and preview opt-ins for indexable pages. Google Discover shows large
 * image cards only with `max-image-preview:large`, and `max-snippet:-1` opts
 * out of the default snippet-length cap that AI features quote from.
 */
export const ROBOTS_PREVIEW_DIRECTIVES = {
  "max-image-preview": "large",
  "max-snippet": -1,
  "max-video-preview": -1,
} as const;

/** Root-layout robots: indexable, with the preview opt-ins for Google too. */
export const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  ...ROBOTS_PREVIEW_DIRECTIVES,
  googleBot: {
    index: true,
    follow: true,
    ...ROBOTS_PREVIEW_DIRECTIVES,
  },
} satisfies Metadata["robots"];

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export type JsonLdData = Record<string, unknown>;

export interface MetadataImageInput {
  url: string;
  width?: number;
  height?: number;
  type?: string;
  alt?: string;
}

interface BuildPageMetadataOptions {
  pathname: string;
  title: string;
  description: string;
  seo?: SEO;
  image?: StrapiImage;
  /**
   * Share image used ahead of `image` but behind an explicit `seo.metaImage`.
   * Posts pass their own `/blog/<slug>/opengraph-image` card here, so a post
   * with no cover no longer shares as the generic site card, and a post with a
   * 1920x1080 WebP cover shares a 1200x630 PNG every unfurler handles.
   */
  defaultImage?: MetadataImageInput;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  /** `article:author` URLs (type `article` only). */
  authors?: string[];
  /** `article:section` (type `article` only). */
  section?: string;
  /** `article:tag` values (type `article` only). */
  tags?: string[];
  keywords?: string | string[];
}

interface WebPageJsonLdOptions {
  pathname: string;
  title: string;
  description: string;
  type?: string;
}

/**
 * The author as inlined on a BlogPosting. Google does not follow an `@id` to a
 * node on another page, so a bare reference left every post's author with no
 * name and no url.
 */
export interface BlogPostingAuthor {
  id: string;
  name: string;
  url?: string;
  sameAs?: string[];
  jobTitle?: string;
  imageUrl?: string;
}

interface BlogPostingJsonLdOptions {
  pathname: string;
  headline: string;
  description: string;
  imageUrl?: string;
  /** Further crops/ratios of the post image; merged after `imageUrl`, deduped. */
  imageUrls?: string[];
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  articleSection?: string;
  readingTimeMinutes?: number;
  authorId?: string;
  /** Inline author Person. Its `id` wins over `authorId`. */
  author?: BlogPostingAuthor;
  publisherId?: string;
}

interface BlogListItem {
  title: string;
  path: string;
  datePublished?: string;
  imageUrl?: string;
}

interface BlogJsonLdOptions {
  pathname: string;
  title: string;
  description: string;
  posts: BlogListItem[];
  authorId?: string;
}

interface FAQJsonLdItem {
  question: string;
  answer: string;
}

interface WebsiteJsonLdOptions {
  name?: string;
  description?: string;
  publisherId?: string;
  sameAs?: string[];
}

interface PersonCredential {
  name: string;
  issuer?: string | null;
  url?: string | null;
  description?: string | null;
}

interface PersonJsonLdOptions {
  id?: string;
  path?: string;
  name?: string;
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  worksForName?: string;
  worksForUrl?: string;
  alumniOf?: string[];
  credentials?: PersonCredential[];
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  mainEntityOfPagePath?: string;
  sameAs?: string[];
  knowsAbout?: string[];
}

interface ProfilePageJsonLdOptions {
  pathname: string;
  title: string;
  description: string;
  personId: string;
}

/** Compares two absolute URLs ignoring a trailing slash and host case. */
function isSameUrl(left: string, right: string): boolean {
  const normalize = (value: string) => {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
    } catch {
      return value.trim().replace(/\/+$/, "");
    }
  };

  return normalize(left) === normalize(right);
}

function normalizeOrigin(value: string, fallback: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return fallback;
  }
}

export function getSiteUrl(): string {
  return normalizeOrigin(publicEnv.siteUrl ?? DEFAULT_SITE_URL, DEFAULT_SITE_URL);
}

export function toAbsoluteUrl(pathOrUrl: string, baseUrl = getSiteUrl()): string {
  if (!pathOrUrl.trim()) {
    return baseUrl;
  }

  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return new URL(normalizedPath, baseUrl).toString();
  }
}

function forceCanonicalHost(pathOrUrl: string, siteUrl = getSiteUrl()): string {
  const canonicalBase = new URL(siteUrl);
  const candidate = toAbsoluteUrl(pathOrUrl, siteUrl);

  try {
    const parsedCandidate = new URL(candidate);
    const protocol = parsedCandidate.protocol;

    if (protocol !== "http:" && protocol !== "https:") {
      return toAbsoluteUrl("/", siteUrl);
    }

    if (parsedCandidate.origin === canonicalBase.origin) {
      return parsedCandidate.toString();
    }

    parsedCandidate.protocol = canonicalBase.protocol;
    parsedCandidate.host = canonicalBase.host;
    return parsedCandidate.toString();
  } catch {
    return toAbsoluteUrl(pathOrUrl, siteUrl);
  }
}

export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  const proxyPath = toAbsoluteStrapiMediaUrl(url);
  return toAbsoluteUrl(proxyPath, getSiteUrl());
}

export function toWebPageId(pathname: string): string {
  return `${toAbsoluteUrl(pathname, getSiteUrl())}#webpage`;
}

export function toPersonId(pathname?: string): string {
  if (!pathname) {
    return `${getSiteUrl()}/#person`;
  }

  return `${toAbsoluteUrl(pathname, getSiteUrl())}#person`;
}

export function resolveCanonicalUrl(pathname: string, canonicalUrl?: string): string {
  const siteUrl = getSiteUrl();

  if (canonicalUrl?.trim()) {
    return forceCanonicalHost(canonicalUrl, siteUrl);
  }

  return forceCanonicalHost(pathname, siteUrl);
}

const TITLE_SEPARATORS = [" | ", " — ", " – ", " - "] as const;

/**
 * Document / Open Graph / Twitter title. Nested routes otherwise pick up the
 * layout `title.template` for `<title>` only, leaving og:title as the short
 * page name. Absolute titles keep those three in sync.
 */
export function composeDocumentTitle(title: string, siteName = SITE_NAME): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed === siteName) {
    return siteName;
  }

  if (TITLE_SEPARATORS.some((separator) => trimmed.endsWith(`${separator}${siteName}`))) {
    return trimmed;
  }

  if (
    trimmed.startsWith(`${siteName} `) ||
    trimmed.startsWith(`${siteName}—`) ||
    trimmed.startsWith(`${siteName}–`) ||
    trimmed.startsWith(`${siteName}-`)
  ) {
    return trimmed;
  }

  return `${trimmed} | ${siteName}`;
}

export function normalizeRobotsValue(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const directives = value
    .split(",")
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);

  return directives.length > 0 ? directives.join(", ") : undefined;
}

/**
 * A CMS `metaRobots` string replaces the root layout's robots object wholesale
 * (Next merges `robots` per segment, not per key), so an editor typing
 * `index, follow` would silently drop the preview opt-ins. Re-append the ones
 * the value does not already set, unless the page is not indexable at all.
 */
export function withRobotsPreviewDirectives(value: string): string {
  const directives = value
    .split(",")
    .map((directive) => directive.trim())
    .filter(Boolean);
  const notIndexable = directives.some(
    (directive) => directive === "noindex" || directive === "none"
  );
  if (notIndexable) {
    return value;
  }

  const additions = Object.entries(ROBOTS_PREVIEW_DIRECTIVES)
    .filter(([key]) => !directives.some((directive) => directive.startsWith(`${key}:`)))
    .map(([key, setting]) => `${key}:${setting}`);

  return [...directives, ...additions].join(", ");
}

export function splitKeywords(keywords?: string): string[] {
  if (!keywords) {
    return [];
  }

  return keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function isJsonLdData(value: unknown): value is JsonLdData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tryParseStructuredDataString(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function normalizeStructuredData(input: unknown): JsonLdData[] {
  if (typeof input === "string") {
    const parsed = tryParseStructuredDataString(input);
    return parsed ? normalizeStructuredData(parsed) : [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => normalizeStructuredData(item));
  }

  if (isJsonLdData(input)) {
    return [input];
  }

  return [];
}

interface MetadataImage {
  url: string;
  width?: number;
  height?: number;
  type?: string;
  alt?: string;
}

function toMetadataImages(
  image: StrapiImage | null | undefined,
  fallbackAlt: string
): MetadataImage[] | undefined {
  if (!image?.url) {
    return undefined;
  }

  const imageUrl = toAbsoluteMediaUrl(image.url);
  if (!imageUrl) {
    return undefined;
  }

  return [
    {
      url: imageUrl,
      width: image.width || undefined,
      height: image.height || undefined,
      type: blankToUndefined(image.mime),
      alt: blankToUndefined(image.alternativeText) ?? fallbackAlt,
    },
  ];
}

function toDefaultMetadataImages(
  image: MetadataImageInput | undefined,
  fallbackAlt: string
): MetadataImage[] | undefined {
  if (!image?.url.trim()) {
    return undefined;
  }

  return [
    {
      url: toAbsoluteUrl(image.url, getSiteUrl()),
      width: image.width,
      height: image.height,
      type: image.type,
      alt: blankToUndefined(image.alt) ?? fallbackAlt,
    },
  ];
}

export function buildPageMetadata({
  pathname,
  title,
  description,
  seo,
  image,
  defaultImage,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  section,
  tags,
  keywords,
}: BuildPageMetadataOptions): Metadata {
  const resolvedTitle = seo?.metaTitle?.trim() || title;
  const documentTitle = composeDocumentTitle(resolvedTitle);
  const resolvedDescription = seo?.metaDescription?.trim() || description;
  const canonical = resolveCanonicalUrl(pathname, seo?.canonicalURL);
  const robots = normalizeRobotsValue(seo?.metaRobots);
  // seo.metaImage is the deliberate social override; then the caller's
  // generated card; then the page image; then the site-wide card.
  const images =
    toMetadataImages(seo?.metaImage, documentTitle) ??
    toDefaultMetadataImages(defaultImage, documentTitle) ??
    toMetadataImages(image, documentTitle) ??
    [
      {
        url: toAbsoluteUrl("/opengraph-image", getSiteUrl()),
        width: 1200,
        height: 630,
        type: "image/png",
        alt: documentTitle,
      },
    ];
  const isArticle = type === "article";
  const articleAuthors = authors?.map((author) => author.trim()).filter(Boolean) ?? [];
  const articleTags = tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
  const articleSection = blankToUndefined(section);

  const metadata: Metadata = {
    title: { absolute: documentTitle },
    description: resolvedDescription,
    keywords: seo?.keywords ?? keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      url: canonical,
      title: documentTitle,
      description: resolvedDescription,
      siteName: SITE_NAME,
      images,
      ...(isArticle && publishedTime ? { publishedTime } : {}),
      ...(isArticle && modifiedTime ? { modifiedTime } : {}),
      ...(isArticle && articleAuthors.length > 0 ? { authors: articleAuthors } : {}),
      ...(isArticle && articleSection ? { section: articleSection } : {}),
      ...(isArticle && articleTags.length > 0 ? { tags: articleTags } : {}),
    },
    // Next replaces `twitter` per segment rather than merging it with the
    // layout's, so site/creator have to be set here as well.
    twitter: {
      card: "summary_large_image",
      site: X_HANDLE,
      creator: X_HANDLE,
      title: documentTitle,
      description: resolvedDescription,
      images,
    },
  };

  if (robots) {
    metadata.robots = withRobotsPreviewDirectives(robots);
  }

  return metadata;
}

/**
 * Titles + robots for not-found metadata. Absolute composed titles keep
 * document / Open Graph / Twitter in sync. A short page-specific description
 * (the route title) prevents the root layout homepage blurb from inheriting
 * onto 404s. Canonical and og:url are explicitly unset so Next does not
 * merge the layout homepage `/` values onto noindex routes.
 */
export function buildNoIndexMetadata(title: string): Metadata {
  const documentTitle = composeDocumentTitle(title);

  return {
    title: { absolute: documentTitle },
    description: title,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: null,
    },
    openGraph: {
      title: documentTitle,
      description: title,
      url: null,
    },
    twitter: {
      title: documentTitle,
      description: title,
    },
  };
}

export function buildWebsiteJsonLd(options: WebsiteJsonLdOptions = {}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const name = options.name ?? SITE_NAME;
  const description = options.description ?? DEFAULT_SITE_DESCRIPTION;
  const publisherId = options.publisherId ?? toPersonId();
  const sameAs = options.sameAs ?? WEBSITE_SAME_AS;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name,
    description,
    inLanguage: "en-US",
    publisher: {
      "@id": publisherId,
    },
    sameAs,
  };
}

export function buildPersonJsonLd(options: PersonJsonLdOptions = {}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonicalPath = options.path;
  const id = options.id ?? toPersonId(canonicalPath);
  const profileUrl = options.url
    ? toAbsoluteUrl(options.url, siteUrl)
    : toAbsoluteUrl(canonicalPath ?? "/", siteUrl);
  const name = options.name ?? PERSON_NAME;
  const title = options.title ?? PERSON_TITLE;
  const description = options.description ?? DEFAULT_SITE_DESCRIPTION;
  const sameAs = options.sameAs ?? PERSON_SAME_AS;
  const knowsAbout = options.knowsAbout ?? DEFAULT_KNOWS_ABOUT;
  const alumniOf = options.alumniOf ?? [];
  const credentials = options.credentials ?? [];
  const hasCredential = credentials
    .map((credential) => {
      if (!credential.name?.trim()) {
        return null;
      }

      // `JSON.stringify` keeps `null`, and a CMS credential with no
      // description or url arrives as `null`, which validators flag (GEO-15).
      const issuer = blankToUndefined(credential.issuer);
      const description = blankToUndefined(credential.description);
      const url = blankToUndefined(credential.url);

      return {
        "@type": "EducationalOccupationalCredential",
        name: credential.name,
        ...(issuer ? { credentialCategory: issuer } : {}),
        ...(description ? { description } : {}),
        ...(url ? { url } : {}),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  const address =
    options.addressLocality || options.addressRegion || options.addressCountry
      ? {
          "@type": "PostalAddress",
          addressLocality: options.addressLocality,
          addressRegion: options.addressRegion,
          addressCountry: options.addressCountry,
        }
      : undefined;

  const worksFor =
    options.worksForName || options.worksForUrl
      ? {
          "@type": "Organization",
          name: options.worksForName,
          url: options.worksForUrl,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": id,
    name,
    url: profileUrl,
    jobTitle: title,
    description,
    image: options.imageUrl,
    worksFor,
    alumniOf: alumniOf.length > 0 ? alumniOf : undefined,
    hasCredential: hasCredential.length > 0 ? hasCredential : undefined,
    address,
    mainEntityOfPage: options.mainEntityOfPagePath
      ? {
          "@id": toWebPageId(options.mainEntityOfPagePath),
        }
      : undefined,
    // The Person's own `url` is not a `sameAs` of itself (GEO-11).
    sameAs: sameAs.filter((link) => !isSameUrl(link, profileUrl)),
    knowsAbout,
  };
}

export function buildWebPageJsonLd({
  pathname,
  title,
  description,
  type = "WebPage",
}: WebPageJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: "en-US",
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
  };
}

export function buildProfilePageJsonLd({
  pathname,
  title,
  description,
  personId,
}: ProfilePageJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    inLanguage: "en-US",
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    mainEntity: {
      "@id": personId,
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path, getSiteUrl()),
    })),
  };
}

function buildInlineAuthor(author: BlogPostingAuthor): Record<string, unknown> {
  const url = blankToUndefined(author.url);
  const jobTitle = blankToUndefined(author.jobTitle);
  const imageUrl = blankToUndefined(author.imageUrl);
  const sameAs = (author.sameAs ?? []).filter(
    (link) => Boolean(link.trim()) && (!url || !isSameUrl(link, url))
  );

  return {
    "@type": "Person",
    "@id": author.id,
    name: author.name,
    ...(url ? { url } : {}),
    ...(jobTitle ? { jobTitle } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function buildBlogPostingJsonLd({
  pathname,
  headline,
  description,
  imageUrl,
  imageUrls,
  datePublished,
  dateModified,
  keywords,
  articleSection,
  readingTimeMinutes,
  authorId,
  author,
  publisherId,
}: BlogPostingJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);
  const resolvedAuthorId = author?.id ?? authorId ?? toPersonId();
  const resolvedPublisherId = publisherId ?? resolvedAuthorId;
  const images = [
    ...new Set(
      [imageUrl, ...(imageUrls ?? [])].filter((url): url is string => Boolean(url?.trim()))
    ),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${canonical}#blogposting`,
    url: canonical,
    mainEntityOfPage: {
      "@id": `${canonical}#webpage`,
    },
    headline,
    description,
    image: images.length > 0 ? images : undefined,
    datePublished,
    dateModified,
    author: author
      ? buildInlineAuthor(author)
      : {
          "@id": resolvedAuthorId,
        },
    publisher: {
      "@id": resolvedPublisherId,
    },
    articleSection,
    keywords,
    isAccessibleForFree: true,
    timeRequired: readingTimeMinutes ? `PT${readingTimeMinutes}M` : undefined,
    inLanguage: "en-US",
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
  };
}

export function buildBlogJsonLd({
  pathname,
  title,
  description,
  posts,
  authorId,
}: BlogJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);
  const resolvedAuthorId = authorId ?? toPersonId();

  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${canonical}#blog`,
    url: canonical,
    name: title,
    description,
    inLanguage: "en-US",
    isPartOf: {
      "@id": `${siteUrl}/#website`,
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${toAbsoluteUrl(post.path, siteUrl)}#blogposting`,
      url: toAbsoluteUrl(post.path, siteUrl),
      headline: post.title,
      datePublished: post.datePublished,
      image: post.imageUrl ? [post.imageUrl] : undefined,
      author: {
        "@id": resolvedAuthorId,
      },
    })),
  };
}

export function buildFAQJsonLd(items: FAQJsonLdItem[]): Record<string, unknown> | null {
  if (items.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
