import Link from "next/link";
import { getArticles } from "@/lib/strapi";
import type { Article } from "@/types/strapi";

const placeholderArticles: Article[] = [
  {
    id: 1,
    documentId: "placeholder-1",
    title: "How CFA Charterholders Can Lead AI Transformation in Finance",
    slug: "cfa-ai-transformation",
    excerpt:
      "The finance industry is undergoing a seismic shift. Here is how CFA professionals can position themselves at the forefront of AI adoption.",
    content: [],
    category: { id: 1, documentId: "cat-1", name: "AI & Finance", slug: "ai-finance", createdAt: "", updatedAt: "", publishedAt: "" },
    publishedDate: "2025-12-15",
    readingTime: 8,
    createdAt: "",
    updatedAt: "",
    publishedAt: "2025-12-15",
  },
  {
    id: 2,
    documentId: "placeholder-2",
    title: "Building Production ML Pipelines for Financial Risk Assessment",
    slug: "ml-pipelines-risk",
    excerpt:
      "A practical guide to designing, deploying, and monitoring machine learning systems that meet the rigorous demands of financial regulation.",
    content: [],
    category: { id: 2, documentId: "cat-2", name: "Machine Learning", slug: "machine-learning", createdAt: "", updatedAt: "", publishedAt: "" },
    publishedDate: "2025-11-28",
    readingTime: 12,
    createdAt: "",
    updatedAt: "",
    publishedAt: "2025-11-28",
  },
  {
    id: 3,
    documentId: "placeholder-3",
    title: "Why Most AI Projects Fail in Financial Services",
    slug: "ai-projects-fail-finance",
    excerpt:
      "The gap between technical teams and domain experts is the leading cause of AI project failure. Understanding both sides changes everything.",
    content: [],
    category: { id: 3, documentId: "cat-3", name: "Strategy", slug: "strategy", createdAt: "", updatedAt: "", publishedAt: "" },
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
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
            05 &mdash; Writing
          </p>
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
