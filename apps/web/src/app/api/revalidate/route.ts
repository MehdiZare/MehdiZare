import { revalidatePath, revalidateTag } from "next/cache";
import { after, NextResponse } from "next/server";
import { serverEnv } from "@/lib/server-env";
import { buildIndexNowUrls, isIndexNowEnabled, submitToIndexNow } from "@/lib/indexnow";
import { isArticleIndexable } from "@/lib/article-content";

type RevalidatePayload = {
  secret?: string;
  event?: string;
  model?: string;
  entry?: {
    slug?: string;
    noindex?: unknown;
    seo?: { metaRobots?: unknown } | null;
  };
  paths?: string[];
};

/**
 * False when the webhook entry renders noindex (the `noindex` box, or a
 * `seo.metaRobots` with `noindex`/`none`), by the same rule as the page's
 * robots meta. The body is untrusted JSON, so only a real boolean and a real
 * string are read; anything else counts as unset.
 */
function isEntryIndexable(entry: RevalidatePayload["entry"]): boolean {
  if (!entry || typeof entry !== "object") return true;
  const metaRobots =
    entry.seo && typeof entry.seo === "object" && typeof entry.seo.metaRobots === "string"
      ? entry.seo.metaRobots
      : undefined;
  return isArticleIndexable({
    noindex: entry.noindex === true,
    seo: metaRobots === undefined ? undefined : { id: 0, metaRobots },
  });
}

function extractSecret(
  request: Request,
  payloadSecret: string | undefined
): string {
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get("secret");
  const headerSecret = request.headers.get("x-revalidate-secret");
  return querySecret ?? headerSecret ?? payloadSecret ?? "";
}

function sanitizePath(path: string): string | null {
  if (!path.startsWith("/")) {
    return null;
  }
  if (path.includes("://")) {
    return null;
  }
  return path;
}

function sanitizeSlug(slug: string): string | null {
  const trimmed = slug.trim();
  if (!trimmed || trimmed.includes("/") || trimmed.includes("://")) return null;
  return encodeURIComponent(trimmed);
}

function collectPaths(payload: RevalidatePayload): string[] {
  const paths = new Set<string>([
    "/",
    "/blog",
    // The sitemap route handler; /sitemap.xml rewrites to it (see that route).
    "/sitemap-main.xml",
    "/robots.txt",
    "/feed.xml",
    "/llms.txt",
    "/.well-known/llms.txt",
    "/author/[slug]",
    "/blog/[slug]",
    "/blog/page/[page]",
    "/blog/category/[slug]",
    "/blog/tag/[slug]",
  ]);

  for (const customPath of payload.paths ?? []) {
    const safePath = sanitizePath(customPath);
    if (safePath) {
      paths.add(safePath);
    }
  }

  const slug = payload.entry?.slug ? sanitizeSlug(payload.entry.slug) : null;
  if (slug) {
    if (payload.model === "article") {
      paths.add(`/blog/${slug}`);
    }
    if (payload.model === "category") {
      paths.add(`/blog/category/${slug}`);
    }
    if (payload.model === "tag") {
      paths.add(`/blog/tag/${slug}`);
    }
    if (payload.model === "author") {
      paths.add(`/author/${slug}`);
    }
  }

  return [...paths];
}

/**
 * Tell IndexNow about a changed post once the response is out. `after` keeps
 * the function alive for it on Vercel without delaying the webhook. Outside a
 * request scope (direct calls in tests) `after` throws, so the task runs
 * detached instead. `submitToIndexNow` never rejects and has its own short
 * timeout, so neither path can fail or hang the webhook.
 */
function scheduleIndexNow(payload: RevalidatePayload): void {
  if (!isIndexNowEnabled()) return;
  // A noindex post is kept out of the sitemap and feed; do not ping it either.
  if (!isEntryIndexable(payload.entry)) return;
  const urls = buildIndexNowUrls({
    event: payload.event,
    model: payload.model,
    encodedSlug: payload.entry?.slug ? sanitizeSlug(payload.entry.slug) : null,
  });
  if (urls.length === 0) return;

  const task = () => submitToIndexNow(urls);
  try {
    after(task);
  } catch {
    void task();
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!serverEnv.revalidateSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing REVALIDATE_SECRET server configuration." },
      { status: 500 }
    );
  }

  let payload: RevalidatePayload = {};
  try {
    payload = (await request.json()) as RevalidatePayload;
  } catch {
    // Allow empty JSON body and query-string-only usage.
  }

  const providedSecret = extractSecret(request, payload.secret);
  if (providedSecret !== serverEnv.revalidateSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const paths = collectPaths(payload);

  revalidateTag("strapi", "max");

  for (const path of paths) {
    // `"page"` is for dynamic *page* routes, whose implicit tag set includes
    // `_N_T_<route>/page`. `/sitemap-main.xml` (like `/feed.xml`) is a route
    // handler: its tags are `_N_T_/sitemap-main.xml/route` and
    // `_N_T_/sitemap-main.xml`, never `/page`. A build's
    // `.next/server/app/sitemap-main.xml.meta` lists them in x-next-cache-tags.
    //
    // So a typeless `revalidatePath("/sitemap-main.xml")` emits exactly the tag
    // the route registers. Passing `"page"` emits `_N_T_/sitemap-main.xml/page`,
    // which nothing registers -- it would quietly never invalidate. There is no
    // `"route"` type to pass instead; typeless is the correct call, so the
    // sitemap takes the branch below.
    if (path.includes("[") && path.includes("]")) {
      revalidatePath(path, "page");
    } else {
      revalidatePath(path);
    }
  }

  scheduleIndexNow(payload);

  return NextResponse.json({
    ok: true,
    event: payload.event ?? null,
    model: payload.model ?? null,
    revalidated: paths,
  });
}
