import type { Metadata } from "next";
import type { SEO, StrapiImage } from "../types/strapi";
import { publicEnv, toAbsoluteStrapiMediaUrl } from "./public-env";
import { DEFAULT_SITE_PROFILE } from "./site-profile-defaults";

const DEFAULT_SITE_URL = "https://www.mehdi-zare.com";

export const SITE_NAME = DEFAULT_SITE_PROFILE.siteName;
export const PERSON_NAME = DEFAULT_SITE_PROFILE.siteName;
export const PERSON_TITLE = DEFAULT_SITE_PROFILE.credentialLine;
export const DEFAULT_SITE_DESCRIPTION = DEFAULT_SITE_PROFILE.siteDescription;

export const PERSON_SAME_AS = [
  "https://www.mehdi-zare.com",
  "https://linkedin.com/in/mehdizare",
  "https://github.com/mehdizare",
  "https://medium.com/@mehdi-zare",
  "https://seekingalpha.com/author/mehdi-zare",
];

export const DEFAULT_KNOWS_ABOUT = [
  "Artificial Intelligence",
  "Machine Learning",
  "Financial Analysis",
  "Quantitative Finance",
  "AI Engineering",
];

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export type JsonLdData = Record<string, unknown>;

interface BuildPageMetadataOptions {
  pathname: string;
  title: string;
  description: string;
  seo?: SEO;
  image?: StrapiImage;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  keywords?: string | string[];
}

interface WebPageJsonLdOptions {
  pathname: string;
  title: string;
  description: string;
  type?: string;
}

interface BlogPostingJsonLdOptions {
  pathname: string;
  headline: string;
  description: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  keywords?: string[];
  articleSection?: string;
  readingTimeMinutes?: number;
  authorId?: string;
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
}

interface PersonCredential {
  name: string;
  issuer?: string;
  url?: string;
  description?: string;
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

function toMetadataImages(
  image: StrapiImage | null | undefined,
  fallbackAlt: string
): Array<{ url: string; width?: number; height?: number; alt?: string }> | undefined {
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
      alt: image.alternativeText ?? fallbackAlt,
    },
  ];
}

export function buildPageMetadata({
  pathname,
  title,
  description,
  seo,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  keywords,
}: BuildPageMetadataOptions): Metadata {
  const resolvedTitle = seo?.metaTitle ?? title;
  const resolvedDescription = seo?.metaDescription ?? description;
  const canonical = resolveCanonicalUrl(pathname, seo?.canonicalURL);
  const robots = normalizeRobotsValue(seo?.metaRobots);
  const resolvedImage = seo?.metaImage ?? image;
  const images =
    toMetadataImages(resolvedImage, resolvedTitle) ??
    [
      {
        url: toAbsoluteUrl("/opengraph-image", getSiteUrl()),
        width: 1200,
        height: 630,
        alt: resolvedTitle,
      },
    ];

  const metadata: Metadata = {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: seo?.keywords ?? keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      url: canonical,
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: SITE_NAME,
      images,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images,
    },
  };

  if (robots) {
    metadata.robots = robots;
  }

  return metadata;
}

export function buildWebsiteJsonLd(options: WebsiteJsonLdOptions = {}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const name = options.name ?? SITE_NAME;
  const description = options.description ?? DEFAULT_SITE_DESCRIPTION;
  const publisherId = options.publisherId ?? toPersonId();

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

      return {
        "@type": "EducationalOccupationalCredential",
        name: credential.name,
        credentialCategory: credential.issuer,
        description: credential.description,
        url: credential.url,
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
    sameAs,
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

export function buildBlogPostingJsonLd({
  pathname,
  headline,
  description,
  imageUrl,
  datePublished,
  dateModified,
  keywords,
  articleSection,
  readingTimeMinutes,
  authorId,
  publisherId,
}: BlogPostingJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);
  const resolvedAuthorId = authorId ?? toPersonId();
  const resolvedPublisherId = publisherId ?? resolvedAuthorId;

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
    image: imageUrl ? [imageUrl] : undefined,
    datePublished,
    dateModified,
    author: {
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
