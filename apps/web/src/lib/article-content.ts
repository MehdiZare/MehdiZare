/**
 * Answer-first article content (CM-03/05/06/07/08/11/12, GEO-05): the pure
 * rules that turn the optional CMS fields into what the post renders, so the
 * page, the JSON-LD, the sitemap, the feed and llms.txt read one answer.
 *
 * Every input is untrusted CMS data. A cleared field arrives as `null` or
 * `""`, JSON fields have no enforced shape, and URL fields are free text, so
 * each resolver drops what it cannot render rather than emitting an empty box,
 * a broken table or a `javascript:` link.
 */
import type { Article, ArticleSource, ComparisonTable, FAQ } from "@/types/strapi";
import { normalizeRobotsValue } from "@/lib/seo";
import { blankToUndefined, firstFilled } from "@/lib/strings";

/** The schema caps `keyTakeaways` at 5; an older or hand-edited row is capped here too. */
export const KEY_TAKEAWAYS_LIMIT = 5;

type ArticleLike = Partial<
  Pick<
    Article,
    | "title"
    | "excerpt"
    | "featuredImage"
    | "featuredImageAlt"
    | "keyTakeaways"
    | "faq"
    | "sources"
    | "comparisonTables"
    | "series"
    | "seriesPart"
    | "crossPostXUrl"
    | "crossPostLinkedinUrl"
    | "noindex"
    | "seo"
  >
>;

// ── Links ─────────────────────────────────────────────────────────────────

/** An absolute http(s) URL, or undefined. Keeps `javascript:` and relative junk out of href and JSON-LD. */
export function toSafeHttpUrl(value: string | null | undefined): string | undefined {
  const trimmed = blankToUndefined(value ?? undefined);
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

// ── Cover alt (CM-03) ─────────────────────────────────────────────────────

/**
 * Alt for the post cover wherever it renders (hero, listing card):
 * the per-article `featuredImageAlt`, then the media library
 * `alternativeText`, then the title. Blank strings count as absent.
 */
export function resolveFeaturedImageAlt(article: ArticleLike): string {
  return (
    firstFilled(
      article.featuredImageAlt,
      article.featuredImage?.alternativeText,
      article.title
    ) ?? ""
  );
}

// ── Robots (CM-11) ────────────────────────────────────────────────────────

function isNonIndexDirective(directive: string): boolean {
  return directive === "noindex" || directive === "none";
}

/**
 * The robots value a post renders. `seo.metaRobots` is the advanced escape
 * hatch and is kept as typed; the `noindex` checkbox only ever tightens it.
 * With the box ticked, an indexable (or empty) `metaRobots` becomes
 * `noindex` plus the editor's own follow directive, defaulting to `follow`,
 * so links out of a hidden post still pass. A `metaRobots` that is already
 * `noindex`/`none` wins unchanged, since it is at least as strict.
 */
export function resolveArticleRobots(article: ArticleLike): string | undefined {
  const base = normalizeRobotsValue(article.seo?.metaRobots);
  if (article.noindex !== true) return base;

  const directives = base?.split(", ") ?? [];
  if (directives.some(isNonIndexDirective)) return base;

  const kept = directives.filter((directive) => directive !== "index");
  const hasFollow = kept.some((directive) => directive === "follow" || directive === "nofollow");
  return ["noindex", ...(hasFollow ? [] : ["follow"]), ...kept].join(", ");
}

/** False when the post renders noindex: it then stays out of the sitemap, feed and llms.txt. */
export function isArticleIndexable(article: ArticleLike): boolean {
  const directives = resolveArticleRobots(article)?.split(", ") ?? [];
  return !directives.some(isNonIndexDirective);
}

// ── Key takeaways (CM-06) ─────────────────────────────────────────────────

export function resolveKeyTakeaways(article: Pick<ArticleLike, "keyTakeaways">): string[] {
  return (article.keyTakeaways ?? [])
    .map((item) => blankToUndefined(item?.text ?? undefined))
    .filter((text): text is string => Boolean(text))
    .slice(0, KEY_TAKEAWAYS_LIMIT);
}

// ── FAQ (CM-12) ───────────────────────────────────────────────────────────

export type ResolvedFaqItem = Pick<FAQ, "question" | "answer">;

/**
 * Complete question/answer pairs only. The page renders exactly this list and
 * the FAQPage JSON-LD is built from the same array, so the markup can never
 * describe a question the reader cannot see.
 */
export function resolveFaqItems(article: ArticleLike): ResolvedFaqItem[] {
  return (article.faq ?? []).flatMap((item) => {
    const question = blankToUndefined(item?.question ?? undefined);
    const answer = blankToUndefined(item?.answer ?? undefined);
    return question && answer ? [{ question, answer }] : [];
  });
}

// ── Sources (CM-07) ───────────────────────────────────────────────────────

export interface ResolvedSource {
  title: string;
  /** Only an absolute http(s) URL; a source with a bad URL renders as plain text. */
  url?: string;
  publisher?: string;
  /** `YYYY-MM-DD`. */
  accessedAt?: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function resolveSource(source: ArticleSource | null | undefined): ResolvedSource | null {
  const title = blankToUndefined(source?.title ?? undefined);
  if (!title) return null;
  const accessedAt = blankToUndefined(source?.accessedAt ?? undefined);
  return {
    title,
    url: toSafeHttpUrl(source?.url),
    publisher: blankToUndefined(source?.publisher ?? undefined),
    accessedAt: accessedAt && DATE_ONLY.test(accessedAt) ? accessedAt : undefined,
  };
}

export function resolveSources(article: ArticleLike): ResolvedSource[] {
  return (article.sources ?? [])
    .map(resolveSource)
    .filter((source): source is ResolvedSource => source !== null);
}

/** schema.org `citation` for BlogPosting: one CreativeWork per source with a usable URL. */
export function buildSourceCitations(
  sources: ResolvedSource[]
): Array<{ "@type": "CreativeWork"; name: string; url: string }> {
  return sources.flatMap((source) =>
    source.url ? [{ "@type": "CreativeWork" as const, name: source.title, url: source.url }] : []
  );
}

/** `2026-08-30` -> `August 30, 2026`, read as a calendar date (no timezone shift). */
export function formatDateOnly(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// ── Comparison tables (CM-05) ─────────────────────────────────────────────

export interface ResolvedComparisonTable {
  caption?: string;
  columns: string[];
  rows: string[][];
  notes?: string;
}

function toCell(value: unknown): string | null {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/**
 * Validates the JSON `columns` (`string[]`) and `rows` (`string[][]`).
 * Numbers and booleans are stringified; `null` is an empty cell. Short rows
 * are padded to the column count. A table whose shape is wrong anywhere -- a
 * non-array, an object cell, a row wider than the header, no header, no rows
 * -- is skipped whole rather than rendered with misattributed values.
 */
export function resolveComparisonTable(
  table: ComparisonTable | null | undefined
): ResolvedComparisonTable | null {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return null;

  const columns: string[] = [];
  for (const value of table.columns) {
    const cell = toCell(value);
    if (cell === null) return null;
    columns.push(cell);
  }
  if (columns.length === 0 || columns.every((column) => column === "")) return null;

  const rows: string[][] = [];
  for (const row of table.rows) {
    if (!Array.isArray(row) || row.length > columns.length) return null;
    const cells: string[] = [];
    for (const value of row) {
      const cell = toCell(value);
      if (cell === null) return null;
      cells.push(cell);
    }
    if (cells.every((cell) => cell === "")) continue;
    while (cells.length < columns.length) cells.push("");
    rows.push(cells);
  }
  if (rows.length === 0) return null;

  return {
    caption: blankToUndefined(table.caption ?? undefined),
    columns,
    rows,
    notes: blankToUndefined(table.notes ?? undefined),
  };
}

export function resolveComparisonTables(article: ArticleLike): ResolvedComparisonTable[] {
  return (article.comparisonTables ?? [])
    .map(resolveComparisonTable)
    .filter((table): table is ResolvedComparisonTable => table !== null);
}

// ── Series (CM-08) ────────────────────────────────────────────────────────

export interface SeriesPartLink {
  slug: string;
  title: string;
  part?: number;
  isCurrent: boolean;
}

export interface ResolvedSeries {
  name: string;
  /** This post's part number, when set. */
  part?: number;
  parts: SeriesPartLink[];
}

function validPart(value: number | null | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}

/**
 * The series this post belongs to and its parts in reading order. `siblings`
 * is whatever the series query returned (it may or may not include the
 * current post); rows from another series, without a slug, or repeated are
 * dropped. Unnumbered parts sort after numbered ones, in the order given.
 */
export function resolveSeries(
  article: ArticleLike & { slug?: string | null },
  siblings: Array<Pick<Article, "slug" | "title"> & { series?: string | null; seriesPart?: number | null }>
): ResolvedSeries | null {
  const name = blankToUndefined(article.series ?? undefined);
  if (!name) return null;
  const currentSlug = blankToUndefined(article.slug ?? undefined);

  type Candidate = {
    slug?: string | null;
    title?: string | null;
    series?: string | null;
    seriesPart?: number | null;
  };
  const seen = new Set<string>();
  const parts: SeriesPartLink[] = [];
  const candidates: Candidate[] = [
    ...(currentSlug
      ? [{ slug: currentSlug, title: article.title ?? "", seriesPart: article.seriesPart, series: name }]
      : []),
    ...siblings,
  ];
  for (const candidate of candidates) {
    const slug = blankToUndefined(candidate.slug ?? undefined);
    const title = blankToUndefined(candidate.title ?? undefined);
    if (!slug || !title || seen.has(slug)) continue;
    // A row that did not return `series` is trusted to the query's filter.
    const candidateSeries: string | undefined =
      candidate.series === undefined ? name : blankToUndefined(candidate.series);
    if (candidateSeries !== name) continue;
    seen.add(slug);
    parts.push({ slug, title, part: validPart(candidate.seriesPart), isCurrent: slug === currentSlug });
  }

  const order = (part: number | undefined) => part ?? Number.POSITIVE_INFINITY;
  const sorted = parts
    .map((part, index) => ({ part, index }))
    .sort((a, b) => order(a.part.part) - order(b.part.part) || a.index - b.index)
    .map(({ part }) => part);

  return { name, part: validPart(article.seriesPart), parts: sorted };
}

// ── Cross-posts (CM-08) ───────────────────────────────────────────────────

export interface ResolvedCrossPosts {
  x?: string;
  linkedin?: string;
}

export function resolveCrossPosts(article: ArticleLike): ResolvedCrossPosts {
  return {
    x: toSafeHttpUrl(article.crossPostXUrl),
    linkedin: toSafeHttpUrl(article.crossPostLinkedinUrl),
  };
}

// ── llms.txt (GEO-08) ─────────────────────────────────────────────────────

function sentence(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

/** The llms.txt note for a post: its key takeaways when it has any, else its excerpt. */
export function resolveLlmsDescription(article: {
  excerpt?: string | null;
  keyTakeaways?: Article["keyTakeaways"];
}): string | undefined {
  const takeaways = resolveKeyTakeaways(article);
  if (takeaways.length > 0) return takeaways.map(sentence).join(" ");
  return blankToUndefined(article.excerpt ?? undefined);
}
