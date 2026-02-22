export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: AnalyticsProperties) => void;
      init?: (apiKey: string, options?: Record<string, unknown>) => void;
      __mzInitialized?: boolean;
    };
  }
}

export function trackEvent(event: string, properties?: AnalyticsProperties): void {
  if (typeof window === "undefined") return;

  try {
    window.posthog?.capture?.(event, properties);
  } catch (error) {
    console.error("Analytics capture error", error);
  }
}
