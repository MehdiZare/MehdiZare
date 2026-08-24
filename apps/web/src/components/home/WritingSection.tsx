import Link from "next/link";
import { buildHomeWritingCards } from "@/content/fallbacks";
import { getArticles } from "@/lib/strapi";
import { Label } from "@/components/shared/Label";

const mediumPublications = [
  {
    title: "LLM-Powered Data Extraction: A Python Developer’s Journey",
    excerpt:
      "From text blobs to structured data with Pydantic, Instructor, and BAML.",
    href: "https://mehdi-zare.medium.com/llm-powered-data-extraction-pydantic-python-instructor-bcdf225502bc",
    eyebrow: "Python in Plain English",
    meta: "Apr 14, 2025",
    external: true,
  },
  {
    title: "Generative UI: Building Dynamic Interfaces with LLMs and AI",
    excerpt:
      "How interfaces can adapt on the fly with structured LLM outputs and dynamic rendering.",
    href: "https://mehdi-zare.medium.com/generative-ui-building-dynamic-interfaces-with-llms-and-ai-b515d943b9aa",
    eyebrow: "Python in Plain English",
    meta: "Apr 10, 2025",
    external: true,
  },
  {
    title: "Evaluating Agentic LLM Applications: Metrics and Testing Strategies",
    excerpt:
      "A practical framework for measuring and hardening agentic systems before production.",
    href: "https://mehdi-zare.medium.com/evaluating-agentic-llm-applications-metrics-and-testing-strategies-2cd2356f4a4c",
    eyebrow: "Towards AI",
    meta: "Apr 8, 2025",
    external: true,
  },
];

export async function WritingSection() {
  let articles: Awaited<ReturnType<typeof getArticles>>["data"] = [];

  try {
    const response = await getArticles({
      pagination: { pageSize: 3 },
      sort: "publishedAt:desc",
    });
    articles = Array.isArray(response.data) ? response.data : [];
  } catch {
    articles = [];
  }

  const cards = buildHomeWritingCards(
    articles.map((article) => ({
      title: article.title,
      href: article.slug ? `/blog/${article.slug}` : "",
      excerpt: article.excerpt,
      eyebrow: article.category?.name,
      meta: article.readingTime ? `${article.readingTime} min read` : undefined,
      external: false,
    })),
    mediumPublications
  );
  const hasCmsArticles = articles.some((article) => article.slug && article.title);

  return (
    <section id="writing" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div>
          <Label>05 &mdash; Writing</Label>
          <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Thinking in public.
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {cards.map((article) => {
            const className =
              "group border border-warm-gray p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-mid-gray hover:shadow-sm";
            const content = (
              <>
                {article.eyebrow ? (
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent-warm">
                    {article.eyebrow}
                  </p>
                ) : null}
                <h3 className="mt-2 font-serif text-xl leading-snug text-ink transition-colors group-hover:text-mid-gray">
                  {article.title}
                </h3>
                {article.excerpt ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mid-gray">
                    {article.excerpt}
                  </p>
                ) : null}
                {article.meta ? (
                  <p className="mt-3 font-mono text-xs text-mid-gray/60">
                    {article.meta}
                  </p>
                ) : null}
              </>
            );

            if (article.external) {
              return (
                <a
                  key={article.key}
                  href={article.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link key={article.key} href={article.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          {hasCmsArticles ? (
            <Link
              href="/blog"
              className="inline-block rounded-sm border border-ink/20 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              View all articles
            </Link>
          ) : (
            <a
              href="https://medium.com/@mehdi-zare"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-sm border border-ink/20 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              View all on Medium
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
