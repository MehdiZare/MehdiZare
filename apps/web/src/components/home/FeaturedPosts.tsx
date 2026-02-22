import Link from "next/link";
import { getArticles } from "@/lib/strapi";
import { PostCard } from "@/components/blog/PostCard";
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

export async function FeaturedPosts() {
  let articles: Article[];

  try {
    const response = await getArticles({
      pagination: { pageSize: 3 },
      sort: "publishedDate:desc",
    });
    articles = response.data;
  } catch {
    // Strapi not running — fall back to placeholders
    articles = [];
  }

  const displayArticles = articles.length > 0 ? articles : placeholderArticles;

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Latest Insights
          </h2>
          <p className="mt-3 text-lg text-gray-600">
            Thoughts on AI, finance, and the intersection of both
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {displayArticles.map((article) => (
            <PostCard key={article.documentId} article={article} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
          >
            View All Posts
            <span className="ml-1" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
