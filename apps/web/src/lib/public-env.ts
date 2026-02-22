const DEFAULT_SITE_URL = "https://mehdi-zare.com";
const DEFAULT_STRAPI_URL = "http://localhost:1337";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

function parseUrl(name: string, value: string | undefined, fallback: string): URL {
  const candidate = value?.trim() || fallback;

  try {
    return new URL(candidate);
  } catch {
    throw new Error(`Invalid ${name} URL: ${candidate}`);
  }
}

function parseOptionalUrl(name: string, value: string | undefined): URL | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value.trim());
  } catch {
    throw new Error(`Invalid ${name} URL: ${value}`);
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
const strapiUrl = parseUrl(
  "NEXT_PUBLIC_STRAPI_URL",
  process.env.NEXT_PUBLIC_STRAPI_URL,
  DEFAULT_STRAPI_URL
);
const posthogHost = parseUrl(
  "NEXT_PUBLIC_POSTHOG_HOST",
  process.env.NEXT_PUBLIC_POSTHOG_HOST,
  DEFAULT_POSTHOG_HOST
);
const beehiivEmbedUrl = parseOptionalUrl(
  "NEXT_PUBLIC_BEEHIIV_EMBED_URL",
  process.env.NEXT_PUBLIC_BEEHIIV_EMBED_URL
);
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";

ensureHttpsInProduction("NEXT_PUBLIC_SITE_URL", siteUrl);
ensureHttpsInProduction("NEXT_PUBLIC_STRAPI_URL", strapiUrl);
ensureHttpsInProduction("NEXT_PUBLIC_POSTHOG_HOST", posthogHost);

if (beehiivEmbedUrl) {
  ensureHttpsInProduction("NEXT_PUBLIC_BEEHIIV_EMBED_URL", beehiivEmbedUrl);
}

export const publicEnv = {
  siteUrl: siteUrl.origin,
  strapiUrl: strapiUrl.origin,
  posthogHost: posthogHost.origin.replace(/\/$/, ""),
  posthogKey,
  beehiivEmbedUrl: beehiivEmbedUrl?.toString() ?? "",
  beehiivEmbedOrigin: beehiivEmbedUrl?.origin ?? "",
  allowedImageHosts: parseCsvList(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS),
} as const;

export function toAbsoluteStrapiMediaUrl(url: string): string {
  if (!url) {
    return publicEnv.strapiUrl;
  }

  try {
    return new URL(url).toString();
  } catch {
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    return new URL(normalizedPath, publicEnv.strapiUrl).toString();
  }
}
