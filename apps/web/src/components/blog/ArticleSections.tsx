import Link from "next/link";
import {
  formatDateOnly,
  type ResolvedComparisonTable,
  type ResolvedCrossPosts,
  type ResolvedFaqItem,
  type ResolvedSeries,
  type ResolvedSource,
} from "@/lib/article-content";

/**
 * The answer-first post sections (CM-05/06/07/08/12, GEO-05). Server
 * components with no client state: every word is in the prerendered HTML,
 * which is what answer engines read and what makes the FAQPage JSON-LD honest.
 *
 * Each takes data already resolved by `@/lib/article-content` and renders
 * nothing for an empty list, so a post without the field looks as it did.
 * `data-article-section` marks each block for the post-build order check.
 */

const SECTION_HEADING = "font-serif text-2xl text-ink";
/**
 * Small mono label. `text-ink`, not `text-accent-warm`: #c4956a on the paper
 * and muted backgrounds is about 2.5:1, below WCAG AA 4.5:1 for text this
 * small. The warm accent stays on the border.
 */
const SECTION_LABEL = "font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink";
const EXTERNAL_LINK =
  "text-ink underline decoration-warm-gray underline-offset-4 transition-colors hover:decoration-ink";

export function KeyTakeaways({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="key-takeaways-heading"
      data-article-section="key-takeaways"
      className="mt-8 border-l-2 border-accent-warm bg-muted px-6 py-5"
    >
      <h2
        id="key-takeaways-heading"
        className={SECTION_LABEL}
      >
        Key takeaways
      </h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function ComparisonTables({ tables }: { tables: ResolvedComparisonTable[] }) {
  if (tables.length === 0) return null;

  return (
    <section data-article-section="comparison-tables" className="mt-10 space-y-8">
      {tables.map((table, tableIndex) => {
        const label = table.caption ?? `Comparison table ${tableIndex + 1}`;
        return (
          <div key={`${tableIndex}-${label}`}>
            {/* Focusable so keyboard users can scroll a wide table on a phone. */}
            <div
              role="region"
              aria-label={label}
              tabIndex={0}
              className="overflow-x-auto border border-warm-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-warm"
            >
              <table className="w-full border-collapse text-left text-sm">
                <caption
                  className={
                    table.caption
                      ? "border-b border-warm-gray px-4 py-3 text-left font-serif text-base text-ink"
                      : "sr-only"
                  }
                >
                  {label}
                </caption>
                <thead className="bg-muted">
                  <tr>
                    {table.columns.map((column, columnIndex) => (
                      <th
                        key={`${columnIndex}-${column}`}
                        scope="col"
                        className="whitespace-nowrap border-b border-warm-gray px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] text-ink"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-warm-gray last:border-b-0">
                      {row.map((cell, cellIndex) =>
                        cellIndex === 0 ? (
                          <th
                            key={cellIndex}
                            scope="row"
                            className="px-4 py-2 align-top font-medium text-ink"
                          >
                            {cell}
                          </th>
                        ) : (
                          <td key={cellIndex} className="px-4 py-2 align-top text-mid-gray">
                            {cell}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.notes ? (
              <p className="mt-2 whitespace-pre-line text-xs text-mid-gray">{table.notes}</p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

export function ArticleSources({ sources }: { sources: ResolvedSource[] }) {
  if (sources.length === 0) return null;

  return (
    <section
      aria-labelledby="article-sources-heading"
      data-article-section="sources"
      className="mt-10 border-t border-warm-gray pt-6"
    >
      <h2 id="article-sources-heading" className={SECTION_HEADING}>
        Sources
      </h2>
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-mid-gray">
        {sources.map((source, index) => (
          <li key={`${index}-${source.title}`}>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={EXTERNAL_LINK}>
                {source.title}
              </a>
            ) : (
              <span className="text-ink">{source.title}</span>
            )}
            {source.publisher ? <>, {source.publisher}</> : null}
            {source.accessedAt ? (
              <>
                , accessed <time dateTime={source.accessedAt}>{formatDateOnly(source.accessedAt)}</time>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function SeriesNav({ series }: { series: ResolvedSeries | null }) {
  if (!series) return null;

  const heading = series.part ? `Part ${series.part} of ${series.name}` : `Part of ${series.name}`;
  const hasSiblingLinks = series.parts.some((part) => !part.isCurrent);

  // Nothing to navigate to: name the series, but add no navigation landmark.
  // h2 in both branches: a sibling of the Sources and FAQ sections around it.
  if (!hasSiblingLinks) {
    return (
      <div data-article-section="series" className="mt-10 border border-warm-gray bg-paper p-6">
        <h2 className={SECTION_LABEL}>{heading}</h2>
      </div>
    );
  }

  return (
    <nav
      aria-labelledby="series-nav-heading"
      data-article-section="series"
      className="mt-10 border border-warm-gray bg-paper p-6"
    >
      <h2 id="series-nav-heading" className={SECTION_LABEL}>
        {heading}
      </h2>
      {/* role="list": Safari drops list semantics from a list-style-none list. */}
      <ol role="list" className="mt-3 space-y-1 text-sm">
        {series.parts.map((part) => {
          const label = part.part ? `Part ${part.part}: ${part.title}` : part.title;
          return (
            <li key={part.slug}>
              {part.isCurrent ? (
                <span aria-current="page" className="font-medium text-ink">
                  {label}
                </span>
              ) : (
                <Link
                  href={`/blog/${part.slug}`}
                  className="text-mid-gray transition-colors hover:text-ink"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Always-open question/answer pairs. Deliberately not the consulting page's
 * accordion: that one renders answers only after a click, and FAQPage markup
 * must describe text the reader can already see.
 */
export function ArticleFaq({ items }: { items: ResolvedFaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="article-faq-heading"
      data-article-section="faq"
      className="mt-10 border-t border-warm-gray pt-6"
    >
      <h2 id="article-faq-heading" className={SECTION_HEADING}>
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-warm-gray">
        {items.map((item, index) => (
          <div key={`${index}-${item.question}`} className="py-4">
            <h3 className="font-medium text-ink">{item.question}</h3>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-mid-gray">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CrossPostLinks({ links }: { links: ResolvedCrossPosts }) {
  const entries = [
    links.x ? { label: "X", href: links.x } : null,
    links.linkedin ? { label: "LinkedIn", href: links.linkedin } : null,
  ].filter((entry): entry is { label: string; href: string } => entry !== null);
  if (entries.length === 0) return null;

  return (
    <p data-article-section="cross-posts" className="mt-8 text-sm text-mid-gray">
      Discuss this post on{" "}
      {entries.map((entry, index) => (
        <span key={entry.label}>
          {index > 0 ? " or " : null}
          <a href={entry.href} target="_blank" rel="noopener noreferrer" className={EXTERNAL_LINK}>
            {entry.label}
          </a>
        </span>
      ))}
      .
    </p>
  );
}
