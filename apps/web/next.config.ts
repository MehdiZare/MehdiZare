import path from "node:path";
import type { NextConfig } from "next";
import { buildCsp, buildReportingEndpoints } from "./src/lib/csp";

const DEFAULT_SITE_URL = "https://www.mehdi-zare.com";
const DEFAULT_STRAPI_URL = "http://localhost:1337";
const DEFAULT_POSTHOG_HOST = "https://t.mehdi-zare.com";
/**
 * Public host of the CMS media bucket (R2_PUBLIC_URL in apps/cms). Strapi's R2
 * provider returns absolute URLs on this host, and `toAbsoluteStrapiMediaUrl`
 * leaves them absolute, so next/image and img-src must always allow it rather
 * than depend on NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS being set.
 */
const CMS_MEDIA_HOST = "media.mehdi-zare.com";
const CSP_REPORT_PATH = "/api/csp-report";

function parseOrigin(value: string | undefined, fallback: string): URL {
  try {
    return new URL(value?.trim() || fallback);
  } catch {
    return new URL(fallback);
  }
}

function parseHostList(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const siteUrl = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL, DEFAULT_SITE_URL);
const strapiUrl = parseOrigin(process.env.STRAPI_URL, DEFAULT_STRAPI_URL);
const posthogUrl = parseOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST, DEFAULT_POSTHOG_HOST);

const additionalImageHosts = parseHostList(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS);
const imageHosts = Array.from(
  new Set([strapiUrl.hostname, siteUrl.hostname, CMS_MEDIA_HOST, ...additionalImageHosts])
).filter(Boolean);

const imageRemotePatterns = imageHosts.flatMap((hostname) => {
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
  if (isLocalHost) {
    return [
      { protocol: "http" as const, hostname },
      { protocol: "https" as const, hostname },
    ];
  }

  return [{ protocol: "https" as const, hostname }];
});

// Keep img-src in step with what next/image is configured to fetch, so adding a
// remote image host cannot silently produce CSP-blocked images.
const cspImageOrigins = imageRemotePatterns.map(
  ({ protocol, hostname }) => `${protocol}://${hostname}`
);

const contentSecurityPolicy = buildCsp({
  siteOrigin: siteUrl.origin,
  posthogOrigin: posthogUrl.origin,
  imageOrigins: cspImageOrigins,
  isProduction: process.env.NODE_ENV === "production",
  reportPath: CSP_REPORT_PATH,
});

const reportingEndpoint = new URL(CSP_REPORT_PATH, siteUrl.origin).href;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Reporting-Endpoints",
    value: buildReportingEndpoints(reportingEndpoint),
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
];

/**
 * Stamped once per build and inlined into the bundle, so it is stable for the
 * life of a deploy and moves exactly when a deploy ships.
 *
 * The sitemap needs this for the pages whose copy lives in the repo (#113).
 * Their `lastmod` used to come from CMS rows that were seeded in February and
 * never edited, then -- once those reads were dropped -- from `new Date()`,
 * which is the moment the sitemap rendered rather than the moment the page
 * changed. Neither is a modification date. This is.
 */
const buildTime = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    BUILD_TIME: buildTime,
    // Origin only, never the token. `toAbsoluteStrapiMediaUrl` also runs in
    // client components, where server-only STRAPI_URL is undefined; without
    // this the server render and hydration disagree on which media URLs belong
    // to Strapi.
    CMS_MEDIA_ORIGIN: strapiUrl.origin,
  },
  poweredByHeader: false,
  images: {
    remotePatterns: imageRemotePatterns,
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  async rewrites() {
    return [
      // The sitemap is a route handler at /sitemap-main.xml so it stays an ISR
      // prerender on Vercel; see src/app/sitemap-main.xml/route.ts.
      { source: "/sitemap.xml", destination: "/sitemap-main.xml" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
