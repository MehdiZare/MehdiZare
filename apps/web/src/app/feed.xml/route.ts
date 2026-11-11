import { buildRssFeed, getRecentArticlesForFeed } from "@/lib/feed";
import { getSiteUrl } from "@/lib/seo";

/**
 * Same bounded ISR as the sitemap. The CMS reads carry the `strapi` tag, and
 * the publish webhook also revalidates `/feed.xml` by path, so a new post
 * shows up without waiting out the window.
 */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  let articles: Awaited<ReturnType<typeof getRecentArticlesForFeed>> = [];
  try {
    articles = await getRecentArticlesForFeed();
  } catch (error) {
    // The build prerenders this with the CMS off, so an unavailable CMS must
    // still produce a valid (empty) channel rather than a failed build.
    console.warn(
      "[feed.xml] CMS unavailable; serving a feed with no items:",
      error instanceof Error ? error.message : error
    );
  }

  return new Response(buildRssFeed(articles, getSiteUrl()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
