import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/server-env";

type RevalidatePayload = {
  secret?: string;
  event?: string;
  model?: string;
  entry?: {
    slug?: string;
  };
  paths?: string[];
};

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
    "/sitemap.xml",
    "/robots.txt",
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
    if ((path.includes("[") && path.includes("]")) || path === "/sitemap.xml") {
      // Metadata routes ignore a typeless revalidatePath; "page" is what
      // actually marks /sitemap.xml stale after a CMS publish.
      revalidatePath(path, "page");
    } else {
      revalidatePath(path);
    }
  }

  return NextResponse.json({
    ok: true,
    event: payload.event ?? null,
    model: payload.model ?? null,
    revalidated: paths,
  });
}
