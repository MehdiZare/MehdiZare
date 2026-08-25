"use client";

import { useEffect } from "react";
import { initSessionAttributionIfNeeded } from "@/lib/analytics-context";
import { publicEnv } from "@/lib/public-env";

const SCRIPT_ID = "posthog-array-js";

export function PostHogScripts() {
  const { posthogHost, posthogKey } = publicEnv;

  useEffect(() => {
    if (!posthogKey) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "PostHog disabled: NEXT_PUBLIC_POSTHOG_KEY is missing."
        );
      }
      return;
    }

    initSessionAttributionIfNeeded();

    const initPosthog = () => {
      if (!window.posthog?.init || window.posthog.__mzInitialized) {
        return;
      }

      window.posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        capture_pageview: true,
        autocapture: true,
      });
      window.posthog.__mzInitialized = true;
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      initPosthog();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `${posthogHost}/static/array.js`;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.onload = initPosthog;
    document.head.appendChild(script);
  }, [posthogHost, posthogKey]);

  return null;
}
