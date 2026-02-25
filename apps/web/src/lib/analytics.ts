import { getSessionAttributionContext } from "./analytics-context";

export type AnalyticsPropertyValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

export type AnalyticsPageType =
  | "home"
  | "consulting"
  | "contact"
  | "blog"
  | "blog_post"
  | "category"
  | "tag"
  | "author"
  | "other";

export type InteractionType = "link_click" | "button_click" | "form_submit";

interface FunnelBaseEventProperties {
  section: string;
  cta_label: string;
  destination: string;
  interaction_type: InteractionType;
}

export type FunnelCtaClickEventProperties = FunnelBaseEventProperties;

export interface FunnelSchedulerOpenEventProperties
  extends FunnelBaseEventProperties {
  provider: "cal_com";
}

export type FunnelContactIntentEventProperties = FunnelBaseEventProperties;

export interface FunnelBlogNavToConsultingEventProperties
  extends FunnelBaseEventProperties {
  origin_content_type: "blog_post" | "blog_index" | "category" | "tag";
}

export interface BinaLookupRequestedEventProperties {
  ticker: string;
}

export interface EventPayloadMap {
  funnel_cta_click: FunnelCtaClickEventProperties;
  funnel_scheduler_open: FunnelSchedulerOpenEventProperties;
  funnel_contact_intent: FunnelContactIntentEventProperties;
  funnel_blog_nav_to_consulting: FunnelBlogNavToConsultingEventProperties;
  bina_lookup_requested: BinaLookupRequestedEventProperties;
}

export type AnalyticsEventName = keyof EventPayloadMap;

const ANALYTICS_EVENT_VERSION = 1 as const;

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: AnalyticsProperties) => void;
      init?: (apiKey: string, options?: Record<string, unknown>) => void;
      __mzInitialized?: boolean;
    };
  }
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

export function resolvePageType(pathname: string): AnalyticsPageType {
  const normalized = normalizePathname(pathname);

  if (normalized === "/") return "home";
  if (normalized === "/consulting" || normalized.startsWith("/consulting/")) {
    return "consulting";
  }
  if (normalized === "/contact" || normalized.startsWith("/contact/")) {
    return "contact";
  }
  if (normalized.startsWith("/author/")) {
    return "author";
  }
  if (normalized.startsWith("/blog/category/")) {
    return "category";
  }
  if (normalized.startsWith("/blog/tag/")) {
    return "tag";
  }
  if (normalized === "/blog" || /^\/blog\/page\/\d+\/?$/.test(normalized)) {
    return "blog";
  }
  if (normalized.startsWith("/blog/")) {
    return "blog_post";
  }

  return "other";
}

function buildAttributionProperties(pathname: string): AnalyticsProperties {
  const context = getSessionAttributionContext();

  return {
    event_version: ANALYTICS_EVENT_VERSION,
    pathname,
    page_type: resolvePageType(pathname),
    landing_page: context?.landing_page ?? pathname,
    entry_pathname: context?.entry_pathname ?? pathname,
    referrer: context?.referrer ?? (typeof document !== "undefined" ? document.referrer || null : null),
    utm_source: context?.utm_source ?? null,
    utm_medium: context?.utm_medium ?? null,
    utm_campaign: context?.utm_campaign ?? null,
    utm_term: context?.utm_term ?? null,
    utm_content: context?.utm_content ?? null,
  };
}

export function captureEvent<K extends AnalyticsEventName>(
  event: K,
  properties: EventPayloadMap[K]
): void {
  if (typeof window === "undefined") return;

  try {
    const pathname = normalizePathname(window.location?.pathname);
    const enrichedProperties: AnalyticsProperties = {
      ...buildAttributionProperties(pathname),
      ...properties,
    };

    window.posthog?.capture?.(event, enrichedProperties);
  } catch (error) {
    console.error("Analytics capture error", error);
  }
}
