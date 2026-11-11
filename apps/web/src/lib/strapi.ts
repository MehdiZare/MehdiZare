import type {
  Article,
  Author,
  Category,
  Tag,
  ContactSubmission,
  ContactSubmissionInput,
  StrapiResponse,
  StrapiCollectionResponse,
} from "@/types/strapi";
import { serverEnv } from "@/lib/server-env";

const STRAPI_URL = serverEnv.strapiUrl;
const STRAPI_API_TOKEN = serverEnv.strapiApiToken;
export const STRAPI_TIMEOUT_MS = 15_000;
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

/** `error.name` / `error.message` from a Strapi error body, when it is JSON. */
interface StrapiErrorDetail {
  name?: string;
  message?: string;
}

class StrapiRequestError extends Error {
  readonly path: string;
  readonly status?: number;
  readonly statusText?: string;
  readonly detail?: StrapiErrorDetail;

  constructor(
    message: string,
    options: { path: string; status?: number; statusText?: string; detail?: StrapiErrorDetail }
  ) {
    super(message);
    this.name = "StrapiRequestError";
    this.path = options.path;
    this.status = options.status;
    this.statusText = options.statusText;
    this.detail = options.detail;
  }
}

function parseStrapiErrorDetail(body: string): StrapiErrorDetail | undefined {
  try {
    const error = (JSON.parse(body) as { error?: unknown })?.error;
    if (!error || typeof error !== "object") return undefined;
    const { name, message } = error as Record<string, unknown>;
    return {
      name: typeof name === "string" ? name : undefined,
      message: typeof message === "string" ? message : undefined,
    };
  } catch {
    return undefined;
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
    const rawBody = await response.text();
    console.error("Strapi API request failed", {
      path: init.path,
      status: response.status,
      statusText: response.statusText,
      bodyPreview: truncateForLogs(rawBody),
    });
    throw new StrapiRequestError("Strapi API returned an error response", {
      path: init.path,
      status: response.status,
      statusText: response.statusText,
      detail: parseStrapiErrorDetail(rawBody),
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

export interface FetchAllPagesOptions {
  /** Unix ms. Do not start another page that cannot finish before this instant. */
  deadlineMs?: number;
}

export interface FetchAllPagesResult<T> {
  items: T[];
  /**
   * False when a later page failed, the caller deadline stopped the walk, or
   * STRAPI_MAX_PAGES cut it short of Strapi's pageCount. Callers that treat a
   * missing row as "does not exist" must ignore `items` unless this is true.
   */
  complete: boolean;
}

/**
 * Walk a collection page by page (caller supplies `sort`), stopping at
 * STRAPI_MAX_PAGES. Truncation is logged rather than silent so a catalog that
 * outgrows the cap shows up in logs instead of quietly dropping sitemap URLs
 * or generateStaticParams entries. Caller pagination is ignored; the helper
 * always requests PAGE_SIZE with withCount.
 *
 * A later-page failure returns rows already collected instead of dropping them.
 * `deadlineMs` skips a further page when remaining time cannot cover
 * STRAPI_TIMEOUT_MS.
 */
export async function fetchAllPagesResult<T>(
  fetchPage: (params: FetchAPIParams) => Promise<StrapiCollectionResponse<T>>,
  label: string,
  params: Omit<FetchAPIParams, "pagination"> = {},
  options: FetchAllPagesOptions = {}
): Promise<FetchAllPagesResult<T>> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    if (
      page > 1 &&
      options.deadlineMs != null &&
      Date.now() + STRAPI_TIMEOUT_MS >= options.deadlineMs
    ) {
      console.warn(
        `[strapi] ${label}: stopping pagination to honor caller deadline; returning ${items.length} row(s)`
      );
      return { items, complete: false };
    }

    let response: StrapiCollectionResponse<T>;
    try {
      response = await fetchPage({
        ...params,
        pagination: { page, pageSize: PAGE_SIZE, withCount: true },
      });
    } catch (error) {
      if (items.length > 0) {
        console.warn(
          `[strapi] ${label}: page ${page} failed after ${items.length} row(s); returning partial results`,
          error
        );
        return { items, complete: false };
      }
      throw error;
    }

    if (!Array.isArray(response.data)) {
      throw new StrapiRequestError(
        `[strapi] ${label}: expected collection data to be an array`,
        { path: `/${label}` }
      );
    }

    items.push(...response.data);

    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      return { items, complete: true };
    }

    if (page >= STRAPI_MAX_PAGES) {
      console.warn(
        `[strapi] ${label}: stopped after ${STRAPI_MAX_PAGES} pages of ${PAGE_SIZE} ` +
          `but Strapi reports ${pageCount}; entries beyond ` +
          `${STRAPI_MAX_PAGES * PAGE_SIZE} are omitted.`
      );
      return { items, complete: false };
    }

    page += 1;
  }
}

export async function fetchAllPages<T>(
  fetchPage: (params: FetchAPIParams) => Promise<StrapiCollectionResponse<T>>,
  label: string,
  params: Omit<FetchAPIParams, "pagination"> = {},
  options: FetchAllPagesOptions = {}
): Promise<T[]> {
  return (await fetchAllPagesResult(fetchPage, label, params, options)).items;
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

/**
 * Article attributes added by the answer-first content model (CM-02 et al.).
 *
 * The CMS and the web deploy separately, and Strapi 5 answers a `fields` or
 * `populate` key it does not know with `400 Invalid key`. Queries without a
 * `fields` list (the listings, the post page) receive the new scalars for free
 * once the CMS has them, so only explicit `fields` lists and the component
 * populates can trip that. `fetchArticles` strips these keys and retries once
 * on that `400 Invalid key` (no other 400), so a web deploy that lands before
 * the CMS deploy degrades to the old model instead of 404ing every post and
 * emptying the sitemap and feed.
 */
export const CONTENT_MODEL_V2_SCALAR_FIELDS = [
  "contentUpdatedAt",
  "featuredImageAlt",
  "series",
  "seriesPart",
  "crossPostXUrl",
  "crossPostLinkedinUrl",
  "noindex",
] as const;

export const CONTENT_MODEL_V2_COMPONENTS = [
  "keyTakeaways",
  "faq",
  "sources",
  "comparisonTables",
] as const;

const CONTENT_MODEL_V2_KEYS: ReadonlySet<string> = new Set([
  ...CONTENT_MODEL_V2_SCALAR_FIELDS,
  ...CONTENT_MODEL_V2_COMPONENTS,
]);

/**
 * The post page's populate: the shared one plus the four components only a
 * post renders. Listings keep `articlePopulate`, so a card grid never pulls
 * FAQs, sources or tables.
 */
const articlePostPopulate = {
  ...articlePopulate,
  keyTakeaways: true,
  faq: true,
  sources: true,
  comparisonTables: true,
};

/**
 * `params` with every content-model v2 key removed from `fields` and from a
 * top-level `populate` object, or `null` when there was nothing to remove.
 * Filters are left alone on purpose: dropping a `series` filter would turn a
 * sibling lookup into "every article".
 */
export function stripContentModelV2(params: FetchAPIParams): FetchAPIParams | null {
  let stripped = false;
  const next: FetchAPIParams = { ...params };

  if (Array.isArray(params.fields)) {
    const fields = params.fields.filter((field) => !CONTENT_MODEL_V2_KEYS.has(field));
    if (fields.length !== params.fields.length) {
      next.fields = fields;
      stripped = true;
    }
  }

  const populate = params.populate;
  if (populate && typeof populate === "object" && !Array.isArray(populate)) {
    const entries = Object.entries(populate);
    const kept = entries.filter(([key]) => !CONTENT_MODEL_V2_KEYS.has(key));
    if (kept.length !== entries.length) {
      next.populate = Object.fromEntries(kept);
      stripped = true;
    }
  }

  return stripped ? next : null;
}

/**
 * True only for Strapi's answer to a query key it does not know:
 * `400 { error: { name: "ValidationError", message: "Invalid key <key>" } }`.
 * Any other 400 (a bad filter value, a malformed query) is a real error and
 * must not be masked by the deploy-order fallback.
 */
function isInvalidKeyError(error: unknown): boolean {
  if (!(error instanceof StrapiRequestError) || error.status !== 400) return false;
  const detail = error.detail;
  if (!detail?.message?.includes("Invalid key")) return false;
  return detail.name === undefined || detail.name === "ValidationError";
}

async function fetchArticles(params: FetchAPIParams): Promise<StrapiCollectionResponse<Article>> {
  try {
    return await fetchAPI<StrapiCollectionResponse<Article>>("/articles", params);
  } catch (error) {
    const legacy = isInvalidKeyError(error) ? stripContentModelV2(params) : null;
    if (!legacy) throw error;
    console.warn(
      "[strapi] /articles rejected a content-model v2 key (is the CMS deployed with the new article schema?); retrying without them"
    );
    return fetchAPI<StrapiCollectionResponse<Article>>("/articles", legacy);
  }
}

const authorPopulate = {
  sameAs: { populate: "*" },
  profileImage: { populate: "*" },
  credentials: { populate: "*" },
};

export async function getArticles(
  params?: FetchAPIParams
): Promise<StrapiCollectionResponse<Article>> {
  return fetchArticles({
    populate: articlePopulate,
    ...params,
  });
}

export async function getArticleBySlug(
  slug: string
): Promise<StrapiCollectionResponse<Article>> {
  return fetchArticles({
    populate: articlePostPopulate,
    filters: {
      slug: { $eq: slug },
    },
  });
}

/** The fields a series navigation needs, nothing else. */
const SERIES_ARTICLE_FIELDS = ["title", "slug", "seriesPart", "publishedDate", "publishedAt"] as const;

/** Upper bound on parts listed; a series is a handful of posts, not a catalog. */
export const SERIES_PART_LIMIT = 50;

/**
 * Every published part of `series`, ordered by part, with only the fields the
 * series navigation renders. The name is trimmed and matched
 * case-insensitively (`$eqi`), so "Agents" and "agents" are one series. Not
 * retried without the v2 keys on `400 Invalid key`: `series` is the filter,
 * and a CMS without the field cannot have a post in a series, so that
 * rejection means "no siblings". Any other error propagates.
 */
export async function getArticlesInSeries(series: string): Promise<Article[]> {
  const name = series.trim();
  if (!name) return [];
  try {
    const response = await fetchAPI<StrapiCollectionResponse<Article>>("/articles", {
      fields: SERIES_ARTICLE_FIELDS,
      filters: { series: { $eqi: name } },
      sort: ["seriesPart:asc", "publishedDate:asc"],
      pagination: { page: 1, pageSize: SERIES_PART_LIMIT },
    });
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (isInvalidKeyError(error)) return [];
    throw error;
  }
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

/**
 * Single-type page fetchers (`getHomePage`, `getAboutPage`, `getConsultingPage`,
 * `getBinaPrintPage`) and `getSiteSettings` used to live here. #100 moved that
 * copy into the repo; #116 stopped seeding those rows. They are deleted rather
 * than kept warm so the CMS round trip cannot quietly grow back. `git log` has
 * them if a page ever genuinely needs to be editor-owned again.
 *
 * Articles, categories, tags and the author record are still CMS-backed.
 */
export async function submitContactForm(
  data: ContactSubmissionInput,
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
