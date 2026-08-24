import path from "node:path";
import type { NextConfig } from "next";

const DEFAULT_SITE_URL = "https://www.mehdi-zare.com";
const DEFAULT_STRAPI_URL = "http://localhost:1337";
const DEFAULT_POSTHOG_HOST = "https://t.mehdi-zare.com";
const DEFAULT_BEEHIIV_EMBED_ORIGIN = "https://embeds.beehiiv.com";
const DEFAULT_CAL_ORIGIN = "https://cal.com";
const DEFAULT_CAL_APP_ORIGIN = "https://app.cal.com";

function parseOrigin(value: string | undefined, fallback: string): URL {
  try {
    return new URL(value?.trim() || fallback);
  } catch {
    return new URL(fallback);
  }
}

function parseOptionalOrigin(value: string | undefined): URL | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
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
const beehiivUrl =
  parseOptionalOrigin(process.env.NEXT_PUBLIC_BEEHIIV_EMBED_URL) ??
  new URL(DEFAULT_BEEHIIV_EMBED_ORIGIN);
const calUrl = new URL(DEFAULT_CAL_ORIGIN);
const calAppUrl = new URL(DEFAULT_CAL_APP_ORIGIN);

const additionalImageHosts = parseHostList(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS);
const imageHosts = Array.from(
  new Set([strapiUrl.hostname, siteUrl.hostname, ...additionalImageHosts])
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

// PostHog loads ingest + assets from nested subdomains (us.i / us-assets.i).
// `*.posthog.com` does not cover those, so both wildcards are required.
// https://posthog.com/docs/advanced/content-security-policy
const posthogCspOrigins = [
  posthogUrl.origin,
  "https://*.posthog.com",
  "https://*.i.posthog.com",
];

const cspConnectOrigins = Array.from(
  new Set([
    siteUrl.origin,
    calUrl.origin,
    calAppUrl.origin,
    ...posthogCspOrigins,
  ])
);
const cspFrameOrigins = Array.from(
  new Set([beehiivUrl.origin, calUrl.origin, calAppUrl.origin])
);
const cspImageOrigins = Array.from(
  new Set([siteUrl.origin, ...posthogCspOrigins])
);

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' " + cspConnectOrigins.join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + cspImageOrigins.join(" "),
  "font-src 'self' data:",
  "connect-src 'self' " + cspConnectOrigins.join(" "),
  "media-src 'self' data: blob: " + cspImageOrigins.join(" "),
  "frame-src 'self' " + cspFrameOrigins.join(" "),
  "worker-src 'self' blob: data:",
];

if (process.env.NODE_ENV === "production") {
  cspDirectives.push("upgrade-insecure-requests");
}

const contentSecurityPolicy = cspDirectives.join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
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

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: imageRemotePatterns,
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
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
