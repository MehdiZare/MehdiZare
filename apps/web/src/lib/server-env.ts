import "server-only";

const strapiApiToken = process.env.STRAPI_API_TOKEN?.trim() || "";
const requiresStrapiApiToken = process.env.REQUIRE_STRAPI_API_TOKEN === "true";

if (requiresStrapiApiToken && !strapiApiToken) {
  throw new Error("Missing STRAPI_API_TOKEN in production.");
}

export const serverEnv = {
  strapiApiToken,
} as const;
