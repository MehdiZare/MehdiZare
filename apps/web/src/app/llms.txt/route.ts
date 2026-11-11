import { getRecentArticlesForFeed } from "@/lib/feed";
import { buildLlmsTxtContent, LLMS_POST_LIMIT, type LlmsArticle } from "@/lib/llms";

/**
 * Lists the published posts, so it refreshes like the sitemap and feed: the
 * CMS read carries the `strapi` tag, and the publish webhook also revalidates
 * `/llms.txt` and `/.well-known/llms.txt` by path.
 */
export const revalidate = 300;

export async function GET(): Promise<Response> {
  let articles: LlmsArticle[] = [];
  try {
    articles = await getRecentArticlesForFeed(LLMS_POST_LIMIT);
  } catch (error) {
    // Prerendered at build with the CMS off: fall back to the static sections.
    console.warn(
      "[llms.txt] CMS unavailable; serving without the post list:",
      error instanceof Error ? error.message : error
    );
  }

  try {
    return new Response(buildLlmsTxtContent(articles), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}
