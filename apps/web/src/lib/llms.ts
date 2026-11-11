import { getSiteUrl } from "./seo";
import { BLOG_PAGE_DESCRIPTION } from "./blog-listing";
import { FEED_PATH } from "./feed";

/** The posts llms.txt lists; a subset of the CMS article shape. */
export interface LlmsArticle {
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
}

/** Upper bound on posts listed, so a growing catalog cannot bloat the file. */
export const LLMS_POST_LIMIT = 50;

function buildAbsolutePath(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).toString();
}

/** One line of markdown: collapses whitespace so a CMS excerpt cannot break the list. */
function singleLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function linkText(value: string): string {
  return value.replace(/([[\]\\])/g, "\\$1");
}

function link(title: string, url: string, description?: string): string {
  const notes = singleLine(description);
  return `- [${linkText(title)}](${url})${notes ? `: ${notes}` : ""}`;
}

function buildPostLinks(articles: LlmsArticle[], siteUrl: string): string[] {
  return articles.flatMap((article) => {
    const slug = singleLine(article.slug);
    const title = singleLine(article.title);
    if (!slug || !title) return [];
    return [
      link(
        title,
        buildAbsolutePath(`/blog/${encodeURIComponent(slug)}`, siteUrl),
        article.excerpt ?? undefined
      ),
    ];
  }).slice(0, LLMS_POST_LIMIT);
}

/**
 * llms.txt in the llmstxt.org shape (GEO-08 / TS-16): an H1, a one-line
 * blockquote summary, then H2 sections of `[title](url): notes` links.
 *
 * `articles` are the published posts, newest first. With none (CMS off or
 * unreachable) the Writing section still links the blog index, so the file is
 * a valid map of the site either way.
 */
export function buildLlmsTxtContent(articles: LlmsArticle[] = []): string {
  const siteUrl = getSiteUrl();
  const lines = [
    "# Mehdi Zare",
    "",
    "> Founder and AI consultant, and CFA Charterholder. Builds and runs small products with AI agents, and helps founders and small teams do the same, remotely.",
    "",
    `Canonical host: ${siteUrl}. Use canonical URLs under this host, and prefer structured data and page metadata over inferred summaries.`,
    "",
    "## Services",
    "",
    link("Consulting", buildAbsolutePath("/consulting", siteUrl)),
    link("AI Engineer", buildAbsolutePath("/ai-engineer", siteUrl)),
    "",
    "## About",
    "",
    link("Home", siteUrl),
    link("About", buildAbsolutePath("/about", siteUrl)),
    link("Author: Mehdi Zare", buildAbsolutePath("/author/mehdi-zare", siteUrl)),
    link("Contact", buildAbsolutePath("/contact", siteUrl)),
    "",
    "## Writing",
    "",
    link("Blog", buildAbsolutePath("/blog", siteUrl), BLOG_PAGE_DESCRIPTION),
    ...buildPostLinks(articles, siteUrl),
    "",
    "## Optional",
    "",
    link("RSS feed", buildAbsolutePath(FEED_PATH, siteUrl), "RSS 2.0 feed of recent posts"),
    link("Sitemap", buildAbsolutePath("/sitemap.xml", siteUrl), "XML sitemap of every indexable page"),
  ];

  return `${lines.join("\n")}\n`;
}
