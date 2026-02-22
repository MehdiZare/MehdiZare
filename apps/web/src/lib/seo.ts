import type { Metadata } from "next";
import type { SEO, StrapiImage } from "@/types/strapi";
import { publicEnv } from "@/lib/public-env";

const DEFAULT_SITE_URL = "https://mehdi-zare.com";
const DEFAULT_STRAPI_URL = "http://localhost:1337";

export const SITE_NAME = "Mehdi Zare";
export const PERSON_NAME = "Mehdi Zare";
export const PERSON_TITLE = "Principal AI Engineer and CFA Charterholder";
export const DEFAULT_SITE_DESCRIPTION =
  "Principal AI Engineer who ships production AI systems across finance, defense, healthcare, and enterprise. From prototype to production.";

export const PERSON_SAME_AS = [
  "https://linkedin.com/in/mehdizare",
  "https://github.com/mehdizare",
  "https://medium.com/@mehdi-zare",
  "https://seekingalpha.com/author/mehdi-zare",
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
}

interface FAQJsonLdItem {
  question: string;
  answer: string;
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

export function getStrapiUrl(): string {
  return normalizeOrigin(publicEnv.strapiUrl ?? DEFAULT_STRAPI_URL, DEFAULT_STRAPI_URL);
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

export function toAbsoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  return toAbsoluteUrl(url, getStrapiUrl());
}

export function resolveCanonicalUrl(pathname: string, canonicalUrl?: string): string {
  if (canonicalUrl?.trim()) {
    return toAbsoluteUrl(canonicalUrl, getSiteUrl());
  }

  return toAbsoluteUrl(pathname, getSiteUrl());
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

export function buildWebsiteJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    inLanguage: "en-US",
    publisher: {
      "@id": `${siteUrl}/#person`,
    },
  };
}

export function buildPersonJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: PERSON_NAME,
    url: siteUrl,
    jobTitle: PERSON_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    sameAs: PERSON_SAME_AS,
    knowsAbout: [
      "Artificial Intelligence",
      "Machine Learning",
      "Financial Analysis",
      "Quantitative Finance",
      "AI Engineering",
    ],
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
}: BlogPostingJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);

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
      "@id": `${siteUrl}/#person`,
    },
    publisher: {
      "@id": `${siteUrl}/#person`,
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
}: BlogJsonLdOptions): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const canonical = toAbsoluteUrl(pathname, siteUrl);

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
        "@id": `${siteUrl}/#person`,
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
