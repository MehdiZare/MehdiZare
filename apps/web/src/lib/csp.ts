/**
 * Content-Security-Policy for the web app.
 *
 * This lives in its own module, rather than inline in `next.config.ts`, so the
 * joined header can be asserted directly in tests instead of grepped out of the
 * config source.
 */

export interface CspOptions {
  /** Canonical site origin, from NEXT_PUBLIC_SITE_URL. */
  siteOrigin: string;
  /**
   * Origin that serves PostHog. In production this is the first-party reverse
   * proxy, which serves the SDK, the per-project config, the recorder/survey
   * bundles and the ingest endpoints, so it is the only PostHog origin the
   * browser ever contacts.
   */
  posthogOrigin: string;
  /** Origins `next/image` may load from. Mirrors `images.remotePatterns`. */
  imageOrigins?: string[];
  isProduction?: boolean;
  /** Same-origin path that collects violation reports. */
  reportPath?: string;
}

/**
 * Cal.com's embed injects a script from app.cal.com and then opens an iframe,
 * so these origins are load-bearing on script-src, connect-src and frame-src.
 */
export const CAL_ORIGINS = ["https://cal.com", "https://app.cal.com"] as const;

/** Name tying the `report-to` directive to the `Reporting-Endpoints` header. */
export const CSP_REPORT_ENDPOINT_NAME = "csp-endpoint";

type Source = string | null | undefined;

function sources(...values: (Source | readonly Source[])[]): string {
  return Array.from(
    new Set(values.flat().filter((value): value is string => Boolean(value)))
  ).join(" ");
}

/**
 * The companion origin PostHog serves assets from, or null when the configured
 * origin serves everything itself.
 *
 * posthog-js splits its endpoints by region. Point `api_host` at a
 * PostHog-hosted origin and it still fetches the remote config and the
 * recorder, survey, dead-click and web-vitals bundles from a sibling
 * `<region>-assets.i.posthog.com`, so allowing only `api_host` blocks them. A
 * first-party reverse proxy serves both, so it needs no companion and the
 * policy stays a single origin.
 *
 * Deriving this from the configured origin, rather than assuming one
 * deployment, keeps the header correct for whatever NEXT_PUBLIC_POSTHOG_HOST
 * happens to be set to.
 */
export function posthogAssetsOrigin(posthogOrigin: string): string | null {
  const match = /^https:\/\/(?:app|(us|eu)(?:-assets)?)(?:\.i)?\.posthog\.com$/.exec(
    posthogOrigin
  );

  if (!match) return null;

  return `https://${match[1] ?? "us"}-assets.i.posthog.com`;
}

export function buildCsp({
  siteOrigin,
  posthogOrigin,
  imageOrigins = [],
  isProduction = false,
  reportPath,
}: CspOptions): string {
  const posthogOrigins = [posthogOrigin, posthogAssetsOrigin(posthogOrigin)];

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    // 'unsafe-inline' is required by Next's inline bootstrap script. It is the
    // weakest part of this policy; removing it needs a nonce threaded through
    // the proxy layer, which is a separate change.
    `script-src ${sources("'self'", "'unsafe-inline'", siteOrigin, CAL_ORIGINS, posthogOrigins)}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", "data:", "blob:", siteOrigin, imageOrigins, posthogOrigin)}`,
    "font-src 'self' data:",
    `connect-src ${sources("'self'", siteOrigin, CAL_ORIGINS, posthogOrigins)}`,
    // No PostHog here: nothing it loads is audio or video.
    "media-src 'self' data: blob:",
    `frame-src ${sources("'self'", CAL_ORIGINS)}`,
    // PostHog's session recorder compresses payloads in a worker built from a
    // blob URL.
    "worker-src 'self' blob:",
  ];

  if (reportPath) {
    // report-uri is deprecated but is still the only mechanism Firefox and
    // Safari implement; report-to is the Reporting API successor Chrome uses.
    directives.push(`report-uri ${reportPath}`);
    directives.push(`report-to ${CSP_REPORT_ENDPOINT_NAME}`);
  }

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

/** Value for the `Reporting-Endpoints` header that `report-to` refers to. */
export function buildReportingEndpoints(reportPath: string): string {
  return `${CSP_REPORT_ENDPOINT_NAME}="${reportPath}"`;
}
