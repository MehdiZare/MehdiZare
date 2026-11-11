/**
 * Editorial dates for articles (CM-02, repo side).
 *
 * Strapi's `publishedAt` and `updatedAt` are system timestamps: a re-publish
 * moves `publishedAt`, and a typo fix or relation change moves `updatedAt`.
 * `publishedDate` is the editor-set date. Listings, the sitemap, the feed and
 * llms.txt read it first and only fall back to the system timestamps when it
 * is empty.
 */

export interface ArticleDateFields {
  publishedDate?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  /**
   * Editor-set "substance changed" date. The article schema does not have this
   * field yet, so no query requests it -- Strapi 5 rejects unknown `fields`
   * with a 400. Once the CMS adds it, add it to the narrowed field lists and
   * it flows through here unchanged.
   */
  contentUpdatedAt?: string | null;
}

/**
 * Sort order every article listing requests from Strapi: editorial date first,
 * then the system publish time as a tiebreak for undated rows and same-day
 * posts. Postgres sorts NULLs first under DESC and Strapi 5 does not add
 * `NULLS LAST`, so callers also run `sortArticlesByPublishedDesc` over the
 * page they get back.
 */
export const ARTICLE_LISTING_SORT: string[] = ["publishedDate:desc", "publishedAt:desc"];

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function latest(values: Array<Date | undefined>): Date | undefined {
  let result: Date | undefined;
  for (const value of values) {
    if (value && (!result || value > result)) result = value;
  }
  return result;
}

/**
 * When the article was published, editorially.
 *
 * `publishedDate` is a date-only Strapi field. When the system `publishedAt`
 * falls on the same UTC day it supplies the time of day; otherwise the date is
 * read as UTC midnight. Undated articles fall back to `publishedAt`.
 */
export function resolveArticlePublishedDate(article: ArticleDateFields): Date | undefined {
  const systemPublished = parseDate(article.publishedAt);
  const editorial = parseDate(article.publishedDate);
  if (!editorial) return systemPublished;

  if (
    DATE_ONLY.test(article.publishedDate ?? "") &&
    systemPublished &&
    systemPublished.toISOString().slice(0, 10) === article.publishedDate
  ) {
    return systemPublished;
  }

  return editorial;
}

/**
 * Sitemap `lastmod` for an article.
 *
 * With an editorial date, this is the later of `contentUpdatedAt` and the
 * editorial publish date, so a typo fix or re-publish does not move it. It is
 * clamped to the newest system timestamp: an editorial date later than any
 * real change (a future-dated post) is not a modification date.
 *
 * Without an editorial date it keeps the previous rule, the later of
 * `updatedAt` and `publishedAt`.
 */
export function resolveArticleLastModified(article: ArticleDateFields): Date | undefined {
  const systemLatest = latest([parseDate(article.updatedAt), parseDate(article.publishedAt)]);
  const contentUpdated = parseDate(article.contentUpdatedAt);
  if (!parseDate(article.publishedDate) && !contentUpdated) return systemLatest;

  const editorial = latest([contentUpdated, resolveArticlePublishedDate(article)]);
  if (!editorial) return systemLatest;
  if (systemLatest && editorial > systemLatest) return systemLatest;
  return editorial;
}

/**
 * Newest-first by editorial publish date, then by system `publishedAt`.
 * Undated rows sort by `publishedAt` alongside dated ones instead of
 * floating to the top, which is where Postgres puts a NULL `publishedDate`.
 * Stable, and returns a new array.
 */
export function sortArticlesByPublishedDesc<T extends ArticleDateFields>(articles: T[]): T[] {
  const time = (value: Date | undefined) => value?.getTime() ?? Number.NEGATIVE_INFINITY;
  return articles
    .map((article, index) => ({ article, index }))
    .sort((a, b) => {
      const byPublished =
        time(resolveArticlePublishedDate(b.article)) - time(resolveArticlePublishedDate(a.article));
      if (byPublished !== 0 && !Number.isNaN(byPublished)) return byPublished;
      const bySystem = time(parseDate(b.article.publishedAt)) - time(parseDate(a.article.publishedAt));
      if (bySystem !== 0 && !Number.isNaN(bySystem)) return bySystem;
      return a.index - b.index;
    })
    .map(({ article }) => article);
}
