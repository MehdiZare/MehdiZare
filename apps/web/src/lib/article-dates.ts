/**
 * Article dates: one rule for every surface (CM-02, GEO-10, TS-17).
 *
 * The post page's metadata (`article:published_time` / `modified_time`) and
 * BlogPosting JSON-LD, the blog listing's BlogPosting children, the sitemap
 * `<lastmod>`, the RSS `<pubDate>` / `<lastBuildDate>`, and every listing sort
 * read the dates from here, so no two of them can disagree about when a post
 * was published or last changed.
 *
 * Published: the CMS `publishedDate` is a date-only field (`2026-08-30`).
 * Emitted raw it carries no time or timezone, so it is serialized as 09:00 in
 * the site's timezone with the correct DST offset
 * (`2026-08-30T09:00:00-04:00`). Only when `publishedDate` is empty does the
 * system `publishedAt` stand in; a re-publish moves `publishedAt`, so it is
 * never preferred over the editorial date.
 *
 * Modified: the editor-set `contentUpdatedAt` once the CMS has it, otherwise
 * the system `updatedAt`, clamped so it never precedes the published date.
 * Strapi 5 stamps `publishedAt` a few milliseconds *after* `updatedAt` on
 * publish, and a back-filled `publishedDate` can be later than the last save;
 * without the clamp the page (and the sitemap) claimed the post was modified
 * before it was published.
 */

export const SITE_TIME_ZONE = "America/New_York";
export const SITE_PUBLISH_HOUR = 9;

/**
 * Sort order every article listing requests from Strapi: editorial date first,
 * then the system publish time as a tiebreak for undated rows and same-day
 * posts. Postgres sorts NULLs first under DESC and Strapi 5 does not add
 * `NULLS LAST`, so callers also run `sortArticlesByPublishedDesc` over the
 * page they get back. A window of exactly N rows can be filled by undated
 * posts and drop a dated one the in-memory sort would have kept, so a
 * single-page slice over-fetches {@link LISTING_OVERFETCH} extra rows first.
 */
export const ARTICLE_LISTING_SORT: string[] = ["publishedDate:desc", "publishedAt:desc"];

/** Extra rows a single-page listing fetches before sorting and slicing. */
export const LISTING_OVERFETCH = 5;

export interface ArticleDateSource {
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

export interface ArticleDates {
  datePublished?: string;
  dateModified?: string;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `GMT-04:00` / `GMT+05:30` / `GMT` -> `-04:00` / `+05:30` / `+00:00`. */
function offsetFor(instant: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((item) => item.type === "timeZoneName")?.value;

  const match = part?.match(/GMT([+-]\d{2}):?(\d{2})?/);
  if (!match) {
    return "+00:00";
  }

  return `${match[1]}:${match[2] ?? "00"}`;
}

/**
 * Serializes a `YYYY-MM-DD` date as `YYYY-MM-DDT09:00:00±hh:mm` in the site
 * timezone. Returns `undefined` for anything that is not a valid date-only
 * string.
 */
export function toSitePublishTimestamp(
  dateOnly: string,
  timeZone = SITE_TIME_ZONE,
  hour = SITE_PUBLISH_HOUR
): string | undefined {
  const match = DATE_ONLY_PATTERN.exec(dateOnly.trim());
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  const probe = new Date(Date.UTC(y, m - 1, d, 12));

  if (
    Number.isNaN(probe.getTime()) ||
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return undefined;
  }

  // DST switches at 02:00 local, so the offset at midday is the offset at
  // 09:00 on the same calendar day.
  return `${year}-${month}-${day}T${pad(hour)}:00:00${offsetFor(probe, timeZone)}`;
}

function parseTime(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

function blank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** A parseable timestamp string, or undefined. */
function validTimestamp(value: string | null | undefined): string | undefined {
  const trimmed = blank(value);
  return parseTime(trimmed) !== undefined ? trimmed : undefined;
}

function resolveDatePublished(source: ArticleDateSource): string | undefined {
  const publishedDate = blank(source.publishedDate);
  if (publishedDate) {
    const editorial = toSitePublishTimestamp(publishedDate) ?? validTimestamp(publishedDate);
    if (editorial) return editorial;
  }
  return validTimestamp(source.publishedAt);
}

/**
 * The single date rule. Strings, for metadata and JSON-LD; the `Date`
 * wrappers below parse these same values for the sitemap, feed and sorts.
 */
export function resolveArticleDates(source: ArticleDateSource): ArticleDates {
  const datePublished = resolveDatePublished(source);
  const modifiedBase = validTimestamp(source.contentUpdatedAt) ?? validTimestamp(source.updatedAt);

  const publishedTime = parseTime(datePublished);
  const modifiedTime = parseTime(modifiedBase);

  let dateModified: string | undefined;
  if (modifiedTime === undefined) {
    dateModified = datePublished;
  } else if (publishedTime !== undefined && modifiedTime < publishedTime) {
    dateModified = datePublished;
  } else {
    dateModified = modifiedBase;
  }

  return { datePublished, dateModified };
}

function toDate(value: string | undefined): Date | undefined {
  const time = parseTime(value);
  return time === undefined ? undefined : new Date(time);
}

/** `datePublished` as a `Date`: the RSS `<pubDate>` and the listing sort key. */
export function resolveArticlePublishedDate(article: ArticleDateSource): Date | undefined {
  return toDate(resolveArticleDates(article).datePublished);
}

/**
 * `dateModified` as a `Date`: the sitemap `<lastmod>` and the feed's
 * `<lastBuildDate>`. Never earlier than `resolveArticlePublishedDate`.
 */
export function resolveArticleLastModified(article: ArticleDateSource): Date | undefined {
  return toDate(resolveArticleDates(article).dateModified);
}

/**
 * Newest-first by published date (the same `datePublished` the page emits),
 * then by system `publishedAt` for same-day posts. Undated rows sort by
 * `publishedAt` alongside dated ones instead of floating to the top, which is
 * where Postgres puts a NULL `publishedDate`. Stable, and returns a new array.
 */
export function sortArticlesByPublishedDesc<T extends ArticleDateSource>(articles: T[]): T[] {
  const time = (value: Date | undefined) => value?.getTime() ?? Number.NEGATIVE_INFINITY;
  return articles
    .map((article, index) => ({
      article,
      index,
      published: time(resolveArticlePublishedDate(article)),
      system: time(toDate(validTimestamp(article.publishedAt))),
    }))
    .sort((a, b) => {
      const byPublished = b.published - a.published;
      if (byPublished !== 0 && !Number.isNaN(byPublished)) return byPublished;
      const bySystem = b.system - a.system;
      if (bySystem !== 0 && !Number.isNaN(bySystem)) return bySystem;
      return a.index - b.index;
    })
    .map(({ article }) => article);
}
