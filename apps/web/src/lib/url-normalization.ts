// Everything this module returns is rendered into an `href` or into `Person`
// JSON-LD `url` / `sameAs`. `new URL()` happily parses `javascript:alert(1)`
// and `data:text/html,…`, so parsing alone is not a validity check — an
// identity URL has to be a web address (#83).
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

function stripWww(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function stripTrailingSlash(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function collapseRootSlash(url: URL): string {
  const hasRootPathOnly = url.pathname === "/" && !url.search && !url.hash;
  const serialized = url.toString();

  if (!hasRootPathOnly) {
    return serialized;
  }

  return serialized.replace(/\/$/, "");
}

export function normalizeIdentityUrl(
  value: string | null | undefined,
  canonicalOrigin: string
): string | null {
  if (!value?.trim()) {
    return null;
  }

  let parsed: URL;
  let canonical: URL;

  try {
    parsed = new URL(value.trim());
    canonical = new URL(canonicalOrigin);
  } catch {
    return null;
  }

  if (!WEB_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  // `identityUrlKey` builds its key from protocol + host + path only, so
  // userinfo that survives here keys identically to the clean URL while
  // serializing differently: the credentialed copy takes the dedupe slot and
  // evicts the canonical one. Credentials are also never valid in a `Person`
  // `url` / `sameAs`, and an embedded password would be published verbatim.
  parsed.username = "";
  parsed.password = "";

  const canonicalApex = stripWww(canonical.hostname).toLowerCase();
  const parsedApex = stripWww(parsed.hostname).toLowerCase();

  if (parsedApex === canonicalApex) {
    parsed.hostname = canonical.hostname;
    parsed.protocol = canonical.protocol;
    parsed.port = canonical.port;
  }

  parsed.pathname = stripTrailingSlash(parsed.pathname);

  return collapseRootSlash(parsed);
}

export function identityUrlKey(
  value: string | null | undefined,
  canonicalOrigin: string
): string {
  const normalized = normalizeIdentityUrl(value, canonicalOrigin);
  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);
    const port = parsed.port ? `:${parsed.port}` : "";
    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${path}${parsed.search}${parsed.hash}`;
  } catch {
    return normalized.toLowerCase();
  }
}

