import type {
  Article,
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
const STRAPI_DISABLED = (process.env.DISABLE_STRAPI_CMS ?? "false").toLowerCase() !== "false";

interface FetchAPIParams {
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  sort?: string | string[];
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
    next: { revalidate: 86_400 },
    path,
  });

  return (await response.json()) as T;
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
  featuredImage: { populate: "*" },
  seo: { populate: { metaImage: { populate: "*" } } },
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

export async function getCategories(): Promise<StrapiCollectionResponse<Category>> {
  return fetchAPI<StrapiCollectionResponse<Category>>("/categories", {
    populate: "*",
    sort: "name:asc",
  });
}

export async function getTags(): Promise<StrapiCollectionResponse<Tag>> {
  return fetchAPI<StrapiCollectionResponse<Tag>>("/tags", {
    populate: "*",
    sort: "name:asc",
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
