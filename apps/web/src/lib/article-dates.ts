/**
 * Publication dates for an article's metadata and BlogPosting JSON-LD.
 *
 * The CMS `publishedDate` is a date-only field (`2026-08-30`). Emitted raw it
 * carries no time or timezone, so `datePublished` and `article:published_time`
 * were ambiguous by up to a day. It is now serialized as 09:00 in the site's
 * timezone with the correct DST offset (`2026-08-30T09:00:00-04:00`).
 *
 * `dateModified` still comes from Strapi `updatedAt` (there is no editorial
 * "content updated" field yet), but it is clamped to never precede
 * `datePublished`. A post whose `publishedDate` is empty falls back to the
 * system `publishedAt`, which Strapi 5 stamps a few milliseconds *after*
 * `updatedAt` on publish, so the page claimed it was modified before it was
 * published.
 *
 * `generateMetadata` and the JSON-LD both read this, so the OG tags and the
 * structured data cannot disagree.
 */

export const SITE_TIME_ZONE = "America/New_York";
export const SITE_PUBLISH_HOUR = 9;

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

export interface ArticleDateSource {
  publishedDate?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export interface ArticleDates {
  datePublished?: string;
  dateModified?: string;
}

export function resolveArticleDates(source: ArticleDateSource): ArticleDates {
  const publishedDate = blank(source.publishedDate);
  const datePublished =
    (publishedDate
      ? toSitePublishTimestamp(publishedDate) ??
        (parseTime(publishedDate) !== undefined ? publishedDate : undefined)
      : undefined) ?? blank(source.publishedAt);

  const updatedAt = blank(source.updatedAt);
  const publishedTime = parseTime(datePublished);
  const updatedTime = parseTime(updatedAt);

  let dateModified: string | undefined;
  if (updatedTime === undefined) {
    dateModified = datePublished;
  } else if (publishedTime !== undefined && updatedTime < publishedTime) {
    dateModified = datePublished;
  } else {
    dateModified = updatedAt;
  }

  return { datePublished, dateModified };
}
