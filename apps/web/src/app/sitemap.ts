import type { MetadataRoute } from "next";
import type { Article } from "@/types/strapi";
import {
  getAboutPage,
  getArticles,
  getBinaPrintPage,
  getConsultingPage,
  getHomePage,
  getNewsletterPage,
} from "@/lib/strapi";
import { getSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo";

const SITE_URL = getSiteUrl();

export const revalidate = 3600;

function safeDate(input: string | undefined, fallback: Date): Date {
  if (!input) {
    return fallback;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

async function getAllArticlesForSitemap(): Promise<Article[]> {
  const pageSize = 100;
  let page = 1;
  const articles: Article[] = [];

  while (true) {
    const response = await getArticles({
      pagination: { page, pageSize, withCount: true },
      sort: "publishedDate:desc",
    });

    articles.push(...response.data);

    const pageCount = response.meta.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      break;
    }

    page += 1;
  }

  return articles;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pageTimestamps = {
    home: now,
    about: now,
    binaPrint: now,
    consulting: now,
    newsletter: now,
    blog: now,
  };

  try {
    const [homeRes, aboutRes, binaPrintRes, consultingRes, newsletterRes] =
      await Promise.all([
        getHomePage(),
        getAboutPage(),
        getBinaPrintPage(),
        getConsultingPage(),
        getNewsletterPage(),
      ]);

    pageTimestamps.home = safeDate(homeRes.data?.updatedAt, now);
    pageTimestamps.about = safeDate(aboutRes.data?.updatedAt, now);
    pageTimestamps.binaPrint = safeDate(binaPrintRes.data?.updatedAt, now);
    pageTimestamps.consulting = safeDate(consultingRes.data?.updatedAt, now);
    pageTimestamps.newsletter = safeDate(newsletterRes.data?.updatedAt, now);
  } catch {
    // Keep build-time fallback dates when CMS is unavailable.
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: pageTimestamps.home,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: pageTimestamps.about,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/bina-print`,
      lastModified: pageTimestamps.binaPrint,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/consulting`,
      lastModified: pageTimestamps.consulting,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/newsletter`,
      lastModified: pageTimestamps.newsletter,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: pageTimestamps.blog,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  let articlePages: MetadataRoute.Sitemap = [];

  try {
    const articles = await getAllArticlesForSitemap();
    if (articles.length > 0) {
      pageTimestamps.blog = safeDate(articles[0]?.updatedAt, pageTimestamps.blog);
    }

    articlePages = articles.map((article) => {
      const imageUrl = toAbsoluteMediaUrl(article.featuredImage?.url);

      return {
        url: `${SITE_URL}/blog/${article.slug}`,
        lastModified: safeDate(article.updatedAt, now),
        changeFrequency: "weekly" as const,
        priority: 0.7,
        images: imageUrl ? [imageUrl] : undefined,
      };
    });
  } catch {
    // Return static pages when CMS is unavailable.
  }

  return [...staticPages, ...articlePages];
}
