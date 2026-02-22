import Link from "next/link";
import { getArticles } from "@/lib/strapi";
import type { Article } from "@/types/strapi";

const placeholderArticles: Article[] = [
  {
    id: 1,
    documentId: "placeholder-1",
    title: "How I Built a Zestimate for Stocks with LLMs and FastAPI",
    slug: "zestimate-for-stocks",
    excerpt:
      "A technical walkthrough of Bina Print — from data pipeline architecture to the scoring engine that processes earnings calls at scale.",
    content: [],
    category: { id: 1, documentId: "cat-1", name: "Medium", slug: "medium", createdAt: "", updatedAt: "", publishedAt: "" },
    publishedDate: "2025-12-15",
    readingTime: 8,
    createdAt: "",
    updatedAt: "",
    publishedAt: "2025-12-15",
  },
  {
    id: 2,
    documentId: "placeholder-2",
    title: "The $2M AI Pilot That Never Shipped",
    slug: "ai-pilot-never-shipped",
    excerpt:
      "A post-mortem on why enterprise AI projects die between demo and deployment — and what the team could have done differently.",
    content: [],
    category: { id: 2, documentId: "cat-2", name: "LinkedIn", slug: "linkedin", createdAt: "", updatedAt: "", publishedAt: "" },
    publishedDate: "2025-11-28",
    readingTime: 12,
    createdAt: "",
    updatedAt: "",
    publishedAt: "2025-11-28",
  },
  {
    id: 3,
    documentId: "placeholder-3",
    title: "When AI Meets the Balance Sheet",
    slug: "ai-meets-balance-sheet",
    excerpt:
      "Why most AI-driven equity research tools fail the same way junior analysts do — and what better architecture looks like.",
    content: [],
    category: { id: 3, documentId: "cat-3", name: "Seeking Alpha", slug: "seeking-alpha", createdAt: "", updatedAt: "", publishedAt: "" },
    publishedDate: "2025-11-10",
    readingTime: 6,
    createdAt: "",
    updatedAt: "",
    publishedAt: "2025-11-10",
  },
];

export async function WritingSection() {
  let articles: Article[];

  try {
    const response = await getArticles({
      pagination: { pageSize: 3 },
      sort: "publishedDate:desc",
    });
    articles = response.data;
  } catch {
    articles = [];
  }

  const displayArticles = articles.length > 0 ? articles : placeholderArticles;

  return (
    <section className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
              05 &mdash; Writing
            </p>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Thinking in public.
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm text-mid-gray underline underline-offset-4 transition-colors hover:text-ink"
          >
            View all articles
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {displayArticles.map((article) => (
            <Link
              key={article.documentId}
              href={`/blog/${article.slug}`}
              className="group"
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
      </div>
    </section>
  );
}
