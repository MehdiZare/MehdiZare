import Link from "next/link";
import { getArticles } from "@/lib/strapi";
import { Label } from "@/components/shared/Label";

interface ExternalPublication {
  title: string;
  excerpt: string;
  href: string;
  publication: string;
  publishedDate: string;
}

const mediumPublications: ExternalPublication[] = [
  {
    title: "LLM-Powered Data Extraction: A Python Developer’s Journey",
    excerpt:
      "From text blobs to structured data with Pydantic, Instructor, and BAML.",
    href: "https://mehdi-zare.medium.com/llm-powered-data-extraction-pydantic-python-instructor-bcdf225502bc",
    publication: "Python in Plain English",
    publishedDate: "Apr 14, 2025",
  },
  {
    title: "Generative UI: Building Dynamic Interfaces with LLMs and AI",
    excerpt:
      "How interfaces can adapt on the fly with structured LLM outputs and dynamic rendering.",
    href: "https://mehdi-zare.medium.com/generative-ui-building-dynamic-interfaces-with-llms-and-ai-b515d943b9aa",
    publication: "Python in Plain English",
    publishedDate: "Apr 10, 2025",
  },
  {
    title: "Evaluating Agentic LLM Applications: Metrics and Testing Strategies",
    excerpt:
      "A practical framework for measuring and hardening agentic systems before production.",
    href: "https://mehdi-zare.medium.com/evaluating-agentic-llm-applications-metrics-and-testing-strategies-2cd2356f4a4c",
    publication: "Towards AI",
    publishedDate: "Apr 8, 2025",
  },
];

export async function WritingSection() {
  let articles: Awaited<ReturnType<typeof getArticles>>["data"];

  try {
    const response = await getArticles({
      pagination: { pageSize: 3 },
      sort: "publishedDate:desc",
    });
    articles = response.data;
  } catch {
    articles = [];
  }

  return (
    <section id="writing" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div>
          <Label>05 &mdash; Writing</Label>
          <h2 className="mt-4 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
            Thinking in public.
          </h2>
        </div>

        {articles.length > 0 ? (
          <>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {articles.map((article) => (
                <Link
                  key={article.documentId}
                  href={`/blog/${article.slug}`}
                  className="group border border-warm-gray p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-mid-gray hover:shadow-sm"
                >
                  {article.category && (
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent-warm">
                      {article.category.name}
                    </p>
                  )}
                  <h3 className="mt-2 font-serif text-xl leading-snug text-ink transition-colors group-hover:text-mid-gray">
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mid-gray">
                      {article.excerpt}
                    </p>
                  )}
                  {article.readingTime && (
                    <p className="mt-3 font-mono text-xs text-mid-gray/60">
                      {article.readingTime} min read
                    </p>
                  )}
                </Link>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                href="/blog"
                className="inline-block rounded-sm border border-ink/20 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                View all articles
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {mediumPublications.map((article) => (
                <a
                  key={article.href}
                  href={article.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group border border-warm-gray p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-mid-gray hover:shadow-sm"
                >
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent-warm">
                    {article.publication}
                  </p>
                  <h3 className="mt-2 font-serif text-xl leading-snug text-ink transition-colors group-hover:text-mid-gray">
                    {article.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-mid-gray">
                    {article.excerpt}
                  </p>
                  <p className="mt-3 font-mono text-xs text-mid-gray/60">
                    {article.publishedDate}
                  </p>
                </a>
              ))}
            </div>

            <div className="mt-10 text-center">
              <a
                href="https://medium.com/@mehdi-zare"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-sm border border-ink/20 px-6 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                View all on Medium
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
