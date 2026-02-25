export interface AttributionContext {
  landing_page: string;
  entry_pathname: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}

const ATTRIBUTION_STORAGE_KEY = "__mz_attribution_context_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname || pathname.trim().length === 0) {
    return "/";
  }

  let p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toUtmValue(searchParams: URLSearchParams, key: string): string | null {
  return toNullableString(searchParams.get(key));
}

export function extractUtmParams(search: string): Pick<
  AttributionContext,
  "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content"
> {
  const parsedSearch = search.startsWith("?") ? search : `?${search}`;
  const searchParams = new URLSearchParams(parsedSearch);

  return {
    utm_source: toUtmValue(searchParams, "utm_source"),
    utm_medium: toUtmValue(searchParams, "utm_medium"),
    utm_campaign: toUtmValue(searchParams, "utm_campaign"),
    utm_term: toUtmValue(searchParams, "utm_term"),
    utm_content: toUtmValue(searchParams, "utm_content"),
  };
}

function isAttributionContext(value: unknown): value is AttributionContext {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<AttributionContext>;
  return (
    typeof candidate.landing_page === "string" &&
    typeof candidate.entry_pathname === "string" &&
    (candidate.referrer === null || typeof candidate.referrer === "string") &&
    (candidate.utm_source === null || typeof candidate.utm_source === "string") &&
    (candidate.utm_medium === null || typeof candidate.utm_medium === "string") &&
    (candidate.utm_campaign === null || typeof candidate.utm_campaign === "string") &&
    (candidate.utm_term === null || typeof candidate.utm_term === "string") &&
    (candidate.utm_content === null || typeof candidate.utm_content === "string")
  );
}

function createCurrentAttributionContext(): AttributionContext {
  const pathname = normalizePathname(window.location?.pathname);
  const utmParams = extractUtmParams(window.location?.search ?? "");

  return {
    landing_page: pathname,
    entry_pathname: pathname,
    referrer: toNullableString(document.referrer),
    ...utmParams,
  };
}

function readStoredAttributionContext(): AttributionContext | null {
  if (!isBrowser()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isAttributionContext(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredAttributionContext(context: AttributionContext): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(context)
    );
  } catch {
    // Ignore storage errors.
  }
}

export function initSessionAttributionIfNeeded(): AttributionContext | null {
  if (!isBrowser()) {
    return null;
  }

  const existing = readStoredAttributionContext();
  if (existing) {
    return existing;
  }

  const context = createCurrentAttributionContext();
  writeStoredAttributionContext(context);
  return context;
}

export function getSessionAttributionContext(): AttributionContext | null {
  if (!isBrowser()) {
    return null;
  }

  return readStoredAttributionContext() ?? initSessionAttributionIfNeeded();
}
