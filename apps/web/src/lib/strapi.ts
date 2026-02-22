import type {
  Article,
  Category,
  Tag,
  AboutPage,
  BinaPrintPage,
  ConsultingPage,
  HomePage,
  NewsletterPage,
  SiteSettings,
  ContactSubmission,
  StrapiResponse,
  StrapiCollectionResponse,
} from "@/types/strapi";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

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

export async function fetchAPI<T>(
  path: string,
  params?: FetchAPIParams
): Promise<T> {
  const url = new URL(`/api${path}`, STRAPI_URL);

  if (params) {
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
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Strapi API error [${res.status}] ${res.statusText}: ${errorBody}`);
    throw new Error(`Failed to fetch from Strapi: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
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

export async function getNewsletterPage(): Promise<StrapiResponse<NewsletterPage>> {
  return fetchAPI<StrapiResponse<NewsletterPage>>("/newsletter-page", {
    populate: {
      archiveLinks: { populate: "*" },
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
  const url = new URL("/api/contact-submissions", STRAPI_URL);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (STRAPI_API_TOKEN) {
    headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify({ data }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Strapi API error [${res.status}] ${res.statusText}: ${errorBody}`);
    throw new Error(`Failed to submit contact form: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as StrapiResponse<ContactSubmission>;
}
