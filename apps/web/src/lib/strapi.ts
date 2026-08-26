import type {
  Article,
  Author,
  Category,
  Tag,
  AboutPage,
  BinaPrintPage,
  ConsultingPage,
  HomePage,
  SiteSettings,
  ContactSubmission,
  StrapiResponse,
  StrapiCollectionResponse,
} from "@/types/strapi";
import { serverEnv } from "@/lib/server-env";

const STRAPI_URL = serverEnv.strapiUrl;
const STRAPI_API_TOKEN = serverEnv.strapiApiToken;
const STRAPI_TIMEOUT_MS = 15_000;
const STRAPI_DISABLED = serverEnv.strapiDisabled;
const DEFAULT_REVALIDATE_SECONDS = 600;

function parseRevalidateSeconds(value: string | undefined): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REVALIDATE_SECONDS;
  }
  return parsed;
}

export const STRAPI_FETCH_REVALIDATE_SECONDS = parseRevalidateSeconds(
  process.env.STRAPI_FETCH_REVALIDATE_SECONDS
);

export interface FetchAPIParams {
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  sort?: string | string[];
  fields?: readonly string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    withCount?: boolean;
  };
  [key: string]: unknown;
}

class StrapiRequestError extends Error {
  readonly path: string;
  readonly status?: number;
  readonly statusText?: string;

  constructor(message: string, options: { path: string; status?: number; statusText?: string }) {
    super(message);
    this.name = "StrapiRequestError";
    this.path = options.path;
    this.status = options.status;
    this.statusText = options.statusText;
  }
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new StrapiRequestError("Strapi path must start with '/'", { path });
  }

  if (path.includes("://")) {
    throw new StrapiRequestError("Absolute URLs are not allowed in Strapi path", { path });
  }

  return path;
}

function buildApiUrl(path: string, params?: FetchAPIParams): URL {
  const normalizedPath = normalizePath(path);
  const url = new URL(`/api${normalizedPath}`, STRAPI_URL);

  if (!params) {
    return url;
  }

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      url.searchParams.set(key, String(value));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === "object" && v !== null) {
          flattenParams(`${key}[${i}]`, v as Record<string, unknown>, url.searchParams);
        } else {
          url.searchParams.set(`${key}[${i}]`, String(v));
        }
      });
    } else if (typeof value === "object") {
      flattenParams(key, value as Record<string, unknown>, url.searchParams);
    }
  });

  return url;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers.Authorization = `Bearer ${STRAPI_API_TOKEN}`;
  }

  return headers;
}

function truncateForLogs(value: string): string {
  return value.length > 512 ? `${value.slice(0, 512)}...` : value;
}

async function fetchStrapi(input: URL, init: RequestInit & { path: string }): Promise<Response> {
  if (STRAPI_DISABLED) {
    throw new StrapiRequestError("Strapi CMS is disabled by configuration", {
      path: init.path,
    });
  }

  let response: Response;

  try {
    response = await fetch(input.toString(), {
      ...init,
      signal: AbortSignal.timeout(STRAPI_TIMEOUT_MS),
    });
  } catch (err) {
    console.warn(
      `⚠ CMS unavailable — failed to reach Strapi at ${input.origin} (path: ${init.path}). Falling back to default content.`,
      err instanceof Error ? err.message : err
    );
    throw new StrapiRequestError("Failed to reach Strapi API", { path: init.path });
  }

  if (!response.ok) {
    const errorBody = truncateForLogs(await response.text());
    console.error("Strapi API request failed", {
      path: init.path,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: errorBody,
    });
    throw new StrapiRequestError("Strapi API returned an error response", {
      path: init.path,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return response;
}

export async function fetchAPI<T>(path: string, params?: FetchAPIParams): Promise<T> {
  const url = buildApiUrl(path, params);
  const response = await fetchStrapi(url, {
    method: "GET",
    headers: buildHeaders(),
    next: {
      revalidate: STRAPI_FETCH_REVALIDATE_SECONDS,
      tags: ["strapi"],
    },
    path,
  });

  return (await response.json()) as T;
}

const PAGE_SIZE = 100;

/**
 * Upper bound on sequential page reads for one collection. Without a cap, an
 * inflated or never-decreasing Strapi pageCount walks until the platform kills
 * the process. This is not a time budget: each page can still cost up to
 * STRAPI_TIMEOUT_MS, so callers with a short isolate must impose their own
 * deadline.
 */
export const STRAPI_MAX_PAGES = 20;

/**
 * Walk a collection page by page (caller supplies `sort`), stopping at
 * STRAPI_MAX_PAGES. Truncation is logged rather than silent so a catalog that
 * outgrows the cap shows up in logs instead of quietly dropping sitemap URLs
 * or generateStaticParams entries. Caller pagination is ignored; the helper
 * always requests PAGE_SIZE with withCount.
 */
export async function fetchAllPages<T>(
  fetchPage: (params: FetchAPIParams) => Promise<StrapiCollectionResponse<T>>,
  label: string,
  params: Omit<FetchAPIParams, "pagination"> = {}
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const response = await fetchPage({
      ...params,
      pagination: { page, pageSize: PAGE_SIZE, withCount: true },
    });

    if (!Array.isArray(response.data)) {
      throw new StrapiRequestError(
        `[strapi] ${label}: expected collection data to be an array`,
        { path: `/${label}` }
      );
    }

    items.push(...response.data);

    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      break;
    }

    if (page >= STRAPI_MAX_PAGES) {
      console.warn(
        `[strapi] ${label}: stopped after ${STRAPI_MAX_PAGES} pages of ${PAGE_SIZE} ` +
          `but Strapi reports ${pageCount}; entries beyond ` +
          `${STRAPI_MAX_PAGES * PAGE_SIZE} are omitted.`
      );
      break;
    }

    page += 1;
  }

  return items;
}

function flattenParams(
  prefix: string,
  obj: Record<string, unknown>,
  searchParams: URLSearchParams
): void {
  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = `${prefix}[${key}]`;

    if (value === undefined || value === null) return;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      searchParams.set(fullKey, String(value));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === "object" && v !== null) {
          flattenParams(`${fullKey}[${i}]`, v as Record<string, unknown>, searchParams);
        } else {
          searchParams.set(`${fullKey}[${i}]`, String(v));
        }
      });
    } else if (typeof value === "object") {
      flattenParams(fullKey, value as Record<string, unknown>, searchParams);
    }
  });
}

const articlePopulate = {
  category: { populate: "*" },
  tags: { populate: "*" },
  author: {
    populate: {
      sameAs: { populate: "*" },
      profileImage: { populate: "*" },
      credentials: { populate: "*" },
    },
  },
  featuredImage: { populate: "*" },
  seo: { populate: { metaImage: { populate: "*" } } },
};

const authorPopulate = {
  sameAs: { populate: "*" },
  profileImage: { populate: "*" },
  credentials: { populate: "*" },
};

export async function getArticles(
  params?: FetchAPIParams
): Promise<StrapiCollectionResponse<Article>> {
  return fetchAPI<StrapiCollectionResponse<Article>>("/articles", {
    populate: articlePopulate,
    ...params,
  });
}

export async function getArticleBySlug(
  slug: string
): Promise<StrapiCollectionResponse<Article>> {
  return fetchAPI<StrapiCollectionResponse<Article>>("/articles", {
    populate: articlePopulate,
    filters: {
      slug: { $eq: slug },
    },
  });
}

export async function getAuthors(
  params?: FetchAPIParams
): Promise<StrapiCollectionResponse<Author>> {
  return fetchAPI<StrapiCollectionResponse<Author>>("/authors", {
    populate: authorPopulate,
    ...params,
  });
}

export async function getAuthorBySlug(
  slug: string
): Promise<StrapiCollectionResponse<Author>> {
  return fetchAPI<StrapiCollectionResponse<Author>>("/authors", {
    populate: authorPopulate,
    filters: {
      slug: { $eq: slug },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });
}

export async function getPrimaryAuthor(): Promise<Author | undefined> {
  const primary = await getAuthors({
    filters: {
      isPrimary: { $eq: true },
    },
    sort: "updatedAt:desc",
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });

  if (primary.data.length > 0) {
    return primary.data[0];
  }

  const fallback = await getAuthors({
    sort: "updatedAt:desc",
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });

  return fallback.data[0];
}

export async function getCategories(
  params?: FetchAPIParams
): Promise<StrapiCollectionResponse<Category>> {
  return fetchAPI<StrapiCollectionResponse<Category>>("/categories", {
    populate: {
      children: { populate: "*" },
      parent: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
    sort: "order:asc",
    ...params,
  });
}

export async function getTags(
  params?: FetchAPIParams
): Promise<StrapiCollectionResponse<Tag>> {
  return fetchAPI<StrapiCollectionResponse<Tag>>("/tags", {
    populate: {
      seo: { populate: { metaImage: { populate: "*" } } },
    },
    sort: "name:asc",
    ...params,
  });
}

export async function getCategoryBySlug(
  slug: string
): Promise<StrapiCollectionResponse<Category>> {
  return fetchAPI<StrapiCollectionResponse<Category>>("/categories", {
    populate: {
      children: { populate: "*" },
      parent: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
    filters: {
      slug: { $eq: slug },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });
}

export async function getTagBySlug(
  slug: string
): Promise<StrapiCollectionResponse<Tag>> {
  return fetchAPI<StrapiCollectionResponse<Tag>>("/tags", {
    populate: {
      seo: { populate: { metaImage: { populate: "*" } } },
    },
    filters: {
      slug: { $eq: slug },
    },
    pagination: {
      page: 1,
      pageSize: 1,
    },
  });
}

export async function getHomePage(): Promise<StrapiResponse<HomePage>> {
  return fetchAPI<StrapiResponse<HomePage>>("/home-page", {
    populate: {
      heroImage: { populate: "*" },
      credibilityItems: { populate: "*" },
      featuredOnItems: { populate: "*" },
      whatIDoCards: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
  });
}

export async function getAboutPage(): Promise<StrapiResponse<AboutPage>> {
  return fetchAPI<StrapiResponse<AboutPage>>("/about-page", {
    populate: {
      stats: { populate: "*" },
      credentials: { populate: "*" },
      experiences: { populate: "*" },
      education: { populate: "*" },
      socialLinks: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
  });
}

export async function getBinaPrintPage(): Promise<StrapiResponse<BinaPrintPage>> {
  return fetchAPI<StrapiResponse<BinaPrintPage>>("/bina-print-page", {
    populate: {
      howItWorks: { populate: "*" },
      topMovers: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
  });
}

export async function getConsultingPage(): Promise<StrapiResponse<ConsultingPage>> {
  return fetchAPI<StrapiResponse<ConsultingPage>>("/consulting-page", {
    populate: {
      audiences: { populate: "*" },
      tiers: { populate: "*" },
      faq: { populate: "*" },
      seo: { populate: { metaImage: { populate: "*" } } },
    },
  });
}

export async function getSiteSettings(): Promise<StrapiResponse<SiteSettings>> {
  return fetchAPI<StrapiResponse<SiteSettings>>("/site-setting", {
    populate: {
      navItems: { populate: "*" },
      socialLinks: { populate: "*" },
      defaultSeo: { populate: { metaImage: { populate: "*" } } },
    },
  });
}

export async function submitContactForm(
  data: Omit<
    ContactSubmission,
    "id" | "documentId" | "createdAt" | "updatedAt" | "publishedAt"
  >
): Promise<StrapiResponse<ContactSubmission>> {
  const path = "/contact-submissions";
  const url = buildApiUrl(path);

  const response = await fetchStrapi(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ data }),
    cache: "no-store",
    path,
  });

  return (await response.json()) as StrapiResponse<ContactSubmission>;
}

export { StrapiRequestError };
