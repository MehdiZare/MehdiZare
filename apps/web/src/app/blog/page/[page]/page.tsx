import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlogListPageContent } from "@/components/blog/BlogListPageContent";
import {
  BLOG_PAGE_SIZE,
  getBlogListingData,
  parsePositivePageNumber,
} from "@/lib/blog-listing";
import { getSiteProfile } from "@/lib/site-profile";
import { getArticles } from "@/lib/strapi";
import { buildPageMetadata, toPersonId } from "@/lib/seo";

interface BlogArchivePageProps {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams(): Promise<Array<{ page: string }>> {
  try {
    const firstPage = await getArticles({
      pagination: {
        page: 1,
        pageSize: BLOG_PAGE_SIZE,
        withCount: true,
      },
      sort: "publishedAt:desc",
    });

    const pageCount = firstPage.meta.pagination?.pageCount ?? 1;
    return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => ({
      page: String(index + 2),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: BlogArchivePageProps): Promise<Metadata> {
  const { page: rawPage } = await params;
  const currentPage = parsePositivePageNumber(rawPage);
  const siteProfile = await getSiteProfile();

  const pageNumberLabel = currentPage && currentPage > 1 ? ` - Page ${currentPage}` : "";
  const metadata = buildPageMetadata({
    pathname: "/blog",
    title: `Blog${pageNumberLabel}`,
    description: siteProfile.siteDescription,
    type: "website",
    keywords: [
      "production AI engineering",
      "LLM systems",
      "AI architecture",
      "reliable AI systems",
      "domain-aware AI",
    ],
  });

  metadata.robots = {
    index: false,
    follow: true,
  };

  return metadata;
}

export default async function BlogArchivePage({ params }: BlogArchivePageProps) {
  const { page: rawPage } = await params;
  const currentPage = parsePositivePageNumber(rawPage);

  if (!currentPage) {
    notFound();
  }

  if (currentPage === 1) {
    redirect("/blog");
  }

  const siteProfile = await getSiteProfile();
  const { articles, pagination, categories } = await getBlogListingData(currentPage);

  if (pagination && currentPage > pagination.pageCount) {
    notFound();
  }

  return (
    <BlogListPageContent
      currentPage={currentPage}
      articles={articles}
      categories={categories}
      pagination={pagination}
      pageTitle="Blog"
      pageDescription={siteProfile.siteDescription}
      canonicalPath="/blog"
      canonicalAuthorId={toPersonId(siteProfile.author.profilePath)}
    />
  );
}
