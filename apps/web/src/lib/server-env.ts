import "server-only";

const DEFAULT_STRAPI_URL = "http://localhost:1337";

function parseUrl(name: string, value: string | undefined, fallback: string): URL {
  const candidate = value?.trim() || fallback;
  try {
    return new URL(candidate);
  } catch {
    throw new Error(`Invalid ${name} URL: ${candidate}`);
  }
}

function ensureHttpsInProduction(name: string, url: URL): void {
  if (process.env.NODE_ENV !== "production") return;
  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new Error(`${name} must use HTTPS in production.`);
  }
}

const strapiUrl = parseUrl("STRAPI_URL", process.env.STRAPI_URL, DEFAULT_STRAPI_URL);
ensureHttpsInProduction("STRAPI_URL", strapiUrl);

const strapiApiToken = process.env.STRAPI_API_TOKEN?.trim() || "";
const requiresStrapiApiToken = process.env.REQUIRE_STRAPI_API_TOKEN === "true";

if (requiresStrapiApiToken && !strapiApiToken) {
  throw new Error("Missing STRAPI_API_TOKEN in production.");
}

export const serverEnv = {
  strapiUrl: strapiUrl.origin,
  strapiApiToken,
} as const;
