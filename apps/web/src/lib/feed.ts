import type { Article } from "@/types/strapi";
import { getArticles } from "@/lib/strapi";
import { isArticleIndexable } from "@/lib/article-content";
import { DEFAULT_SITE_PROFILE } from "@/lib/site-profile-defaults";
import { BLOG_PAGE_DESCRIPTION } from "@/lib/blog-listing";
import {
  ARTICLE_LISTING_SORT,
  resolveArticleLastModified,
  resolveArticlePublishedDate,
  sortArticlesByPublishedDesc,
} from "@/lib/article-dates";
import { FEED_PATH, FEED_TITLE } from "@/lib/feed-constants";

export { FEED_ALTERNATE_TYPES, FEED_PATH, FEED_TITLE } from "@/lib/feed-constants";

export const FEED_ITEM_LIMIT = 20;

/**
 * Only what the RSS feed renders. `contentUpdatedAt` and `noindex` are
 * content-model v2 (CM-02/11): `getArticles` drops them and retries once if
 * Strapi answers `400 Invalid key` because the CMS has not been deployed with
 * them yet, so the feed degrades to the old fields rather than going empty.
 * The feed never renders takeaways, so it does not populate them.
 */
export const FEED_ARTICLE_QUERY = {
  fields: [
    "title",
    "slug",
    "excerpt",
    "publishedDate",
    "publishedAt",
    "updatedAt",
    "contentUpdatedAt",
    "noindex",
  ],
  populate: {
    category: { fields: ["name", "slug"] },
    tags: { fields: ["name", "slug"] },
    author: { fields: ["name"] },
    seo: { fields: ["metaRobots"] },
  },
};

/**
 * The feed query plus `keyTakeaways` (CM-06, also v2): llms.txt describes a
 * post by its takeaways, the feed does not.
 */
export const LLMS_ARTICLE_QUERY = {
  ...FEED_ARTICLE_QUERY,
  populate: {
    ...FEED_ARTICLE_QUERY.populate,
    keyTakeaways: true,
  },
};

/** Escapes markup and drops the control characters XML 1.0 forbids. */
export function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function trimmed(value: string | null | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function buildItem(article: Article, siteUrl: string): string | null {
  const slug = trimmed(article.slug);
  const title = trimmed(article.title);
  if (!slug || !title) return null;

  const url = `${siteUrl}/blog/${encodeURIComponent(slug)}`;
  const published = resolveArticlePublishedDate(article);
  const description = trimmed(article.excerpt);
  const author = trimmed(article.author?.name) ?? DEFAULT_SITE_PROFILE.authorName;
  const categories = [
    trimmed(article.category?.name),
    ...(article.tags ?? []).map((tag) => trimmed(tag?.name)),
  ].filter((name, index, all): name is string => Boolean(name) && all.indexOf(name) === index);

  const lines = [
    "    <item>",
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(url)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
    published ? `      <pubDate>${published.toUTCString()}</pubDate>` : null,
    description ? `      <description>${escapeXml(description)}</description>` : null,
    // RSS 2.0 <author> must be an email address; dc:creator carries a name.
    `      <dc:creator>${escapeXml(author)}</dc:creator>`,
    ...categories.map((name) => `      <category>${escapeXml(name)}</category>`),
    "    </item>",
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/**
 * RSS 2.0 for the newest posts (TS-07 / GEO-12). Pure: callers pass the
 * articles, so the CMS-off path is just an empty list.
 */
export function buildRssFeed(articles: Article[], siteUrl: string): string {
  // Rows that cannot render (no slug or title) are dropped before the cap, so
  // they never cost a slot.
  const entries = sortArticlesByPublishedDesc(articles.filter(isArticleIndexable))
    .map((article) => ({ article, item: buildItem(article, siteUrl) }))
    .filter((entry): entry is { article: Article; item: string } => entry.item !== null)
    .slice(0, FEED_ITEM_LIMIT);
  const items = entries.map((entry) => entry.item);

  let lastBuild: Date | undefined;
  for (const { article } of entries) {
    const date = resolveArticleLastModified(article);
    if (date && (!lastBuild || date > lastBuild)) lastBuild = date;
  }

  const channel = [
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(`${siteUrl}/blog`)}</link>`,
    `    <description>${escapeXml(BLOG_PAGE_DESCRIPTION)}</description>`,
    "    <language>en-us</language>",
    `    <atom:link href="${escapeXml(`${siteUrl}${FEED_PATH}`)}" rel="self" type="application/rss+xml"/>`,
    lastBuild ? `    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>` : null,
    ...items,
  ].filter((line): line is string => line !== null);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    ...channel,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/**
 * The newest posts for the feed (or, with `withTakeaways`, for llms.txt),
 * newest first. Over-fetches by a few rows so noindex posts dropped later do
 * not shrink the list. Throws when the CMS is unavailable; callers fall back
 * to static output.
 */
export async function getRecentArticlesForFeed(
  limit = FEED_ITEM_LIMIT,
  options: { withTakeaways?: boolean } = {}
): Promise<Article[]> {
  const response = await getArticles({
    ...(options.withTakeaways ? LLMS_ARTICLE_QUERY : FEED_ARTICLE_QUERY),
    sort: ARTICLE_LISTING_SORT,
    pagination: { page: 1, pageSize: limit + 5 },
  });
  return sortArticlesByPublishedDesc(
    Array.isArray(response.data) ? response.data.filter(isArticleIndexable) : []
  ).slice(0, limit);
}
