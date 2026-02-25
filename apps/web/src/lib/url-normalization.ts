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

