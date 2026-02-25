const DEFAULT_SITE_URL = "https://mehdi-zare.com";
const DEFAULT_POSTHOG_HOST = "https://t.mehdi-zare.com";

function parseUrl(name: string, value: string | undefined, fallback: string): URL {
  const candidate = value?.trim() || fallback;

  try {
    return new URL(candidate);
  } catch {
    throw new Error(`Invalid ${name} URL: ${candidate}`);
  }
}

function parseCsvList(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureHttpsInProduction(name: string, url: URL): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");

  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error(`${name} must use HTTPS in production.`);
  }
}

const siteUrl = parseUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL);
const posthogHost = parseUrl(
  "NEXT_PUBLIC_POSTHOG_HOST",
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  DEFAULT_POSTHOG_HOST
);
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";

ensureHttpsInProduction("NEXT_PUBLIC_SITE_URL", siteUrl);
ensureHttpsInProduction("NEXT_PUBLIC_POSTHOG_HOST", posthogHost);

export const publicEnv = {
  siteUrl: siteUrl.origin,
  posthogHost: posthogHost.origin.replace(/\/$/, ""),
  posthogKey,
  allowedImageHosts: parseCsvList(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS),
} as const;

export function toAbsoluteStrapiMediaUrl(url: string): string {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname === "/uploads" || parsed.pathname.startsWith("/uploads/")) {
      return `/cms-uploads${parsed.pathname.slice("/uploads".length)}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    if (url.startsWith("/uploads/") || url === "/uploads") {
      const queryIdx = url.indexOf("?");
      const path = queryIdx !== -1 ? url.slice(0, queryIdx) : url;
      const rest = queryIdx !== -1 ? url.slice(queryIdx) : "";
      return `/cms-uploads${path.slice("/uploads".length)}${rest}`;
    }
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    return `/cms-uploads${normalizedPath}`;
  }
}
