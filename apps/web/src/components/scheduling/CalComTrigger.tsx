"use client";

import { useEffect } from "react";
import { getCalApi } from "@calcom/embed-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface CalComTriggerProps {
  label?: string;
  className?: string;
  page?: string;
  section?: string;
}

const CAL_NAMESPACE = "20min";
const CAL_LINK = "mehdi-zare/20min";
const CAL_CONFIG =
  '{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}';

export function CalComTrigger({
  label = "Book a 20-Min Call",
  className,
  page = "unknown",
  section = "unknown",
}: CalComTriggerProps) {
  useEffect(() => {
    (async function initCalEmbed() {
      const cal = await getCalApi({ namespace: CAL_NAMESPACE });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <button
      type="button"
      data-cal-namespace={CAL_NAMESPACE}
      data-cal-link={CAL_LINK}
      data-cal-config={CAL_CONFIG}
      onClick={() => {
        trackEvent("scheduler_opened", {
          page,
          section,
          provider: "cal_com",
          cta_label: label,
        });
      }}
      className={cn(
        "inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85",
        className
      )}
    >
      {label}
    </button>
  );
}
