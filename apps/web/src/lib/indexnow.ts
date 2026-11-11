import { INDEXNOW_KEY } from "@/app/indexnow-key.txt/route";
import { getSiteUrl } from "@/lib/seo";

/**
 * IndexNow submission for the publish webhook (TS-08 / GEO-12).
 *
 * IndexNow is how Bing (and Yandex, Seznam, Naver) learn about a changed URL
 * without waiting for a recrawl. It has no effect on Google.
 *
 * The key is served at `/indexnow-key.txt`, not the default `/<key>.txt`, so
 * every submission names it in `keyLocation`.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_TIMEOUT_MS = 5_000;

/**
 * Article webhook events that change what a public URL serves. `entry.update`
 * and `entry.create` are left out: under Strapi 5 draft & publish they fire on
 * draft saves, which change nothing a crawler can see. Unpublish and delete
 * are included because IndexNow also tells engines a URL is gone.
 */
const INDEXNOW_ARTICLE_EVENTS = new Set(["entry.publish", "entry.unpublish", "entry.delete"]);

/**
 * Only the production deployment submits. Preview deployments, local dev and
 * the test suite all receive webhooks too, and every one would otherwise ping
 * engines about www URLs with the real key.
 */
export function isIndexNowEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === "production";
}

/**
 * Absolute URLs to submit for a webhook, or none. `encodedSlug` must already
 * be sanitized and URI-encoded by the caller.
 */
export function buildIndexNowUrls(input: {
  event?: string;
  model?: string;
  encodedSlug: string | null;
  siteUrl?: string;
}): string[] {
  if (input.model !== "article" || !input.encodedSlug) return [];
  if (!input.event || !INDEXNOW_ARTICLE_EVENTS.has(input.event)) return [];
  const siteUrl = input.siteUrl ?? getSiteUrl();
  return [`${siteUrl}/blog/${input.encodedSlug}`, `${siteUrl}/blog`];
}

/**
 * POSTs `urls` to IndexNow. Never throws: a failure, non-2xx answer or timeout
 * is logged and reported as `false`, so it cannot fail the webhook.
 */
export async function submitToIndexNow(
  urls: string[],
  options: { siteUrl?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {}
): Promise<boolean> {
  if (urls.length === 0) return false;
  const siteUrl = options.siteUrl ?? getSiteUrl();
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(siteUrl).host,
        key: INDEXNOW_KEY,
        keyLocation: `${siteUrl}/indexnow-key.txt`,
        urlList: urls,
      }),
      signal: AbortSignal.timeout(options.timeoutMs ?? INDEXNOW_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(`[indexnow] submission rejected: ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[indexnow] submission failed", error instanceof Error ? error.message : error);
    return false;
  }
}
