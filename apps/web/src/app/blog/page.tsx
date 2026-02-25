import type { Metadata } from "next";
import { BlogListPageContent } from "@/components/blog/BlogListPageContent";
import { getBlogListingData } from "@/lib/blog-listing";
import { getSiteProfile } from "@/lib/site-profile";
import { buildPageMetadata, toPersonId } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();

  return buildPageMetadata({
    pathname: "/blog",
    title: "Blog",
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
}

export default async function BlogPage() {
  const currentPage = 1;
  const siteProfile = await getSiteProfile();
  const { articles, pagination, categories } = await getBlogListingData(currentPage);

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
