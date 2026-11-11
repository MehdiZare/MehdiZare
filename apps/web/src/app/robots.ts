import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

const SITE_URL = getSiteUrl();

/** Paths no crawler should fetch. Every group repeats them (see below). */
const DISALLOWED_PATHS = ["/api/"];

/**
 * AI crawler policy (GEO-09): every named AI crawler below is allowed, on
 * purpose. This is a personal brand that wants to be found, cited and quoted
 * by AI search and assistants, so both groups are allowed:
 *
 * - Search and user-fetch agents, which fetch pages to answer a query or cite
 *   a source.
 * - Training crawlers and control tokens (`Google-Extended` and
 *   `Applebot-Extended` are robots.txt tokens, not fetchers).
 *
 * Without named groups, `*` already allowed all of them, but nothing recorded
 * that as a decision. A later robots.ts refactor or edge bot rule could then
 * block search-time AI fetchers without anyone noticing. To opt out of
 * training later, move the training list into a `disallow: "/"` group and
 * leave the search list alone.
 *
 * A named group replaces `*` for that crawler rather than adding to it, so
 * each group repeats `DISALLOWED_PATHS`.
 */
export const AI_SEARCH_USER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

export const AI_TRAINING_USER_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: AI_SEARCH_USER_AGENTS,
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      {
        userAgent: AI_TRAINING_USER_AGENTS,
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
