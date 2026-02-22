"use client";

import { InlineWidget } from "react-calendly";
import { publicEnv } from "@/lib/public-env";

interface CalendlyEmbedProps {
  url?: string;
}

export function CalendlyEmbed({
  url = publicEnv.calendlyUrl || "https://calendly.com/placeholder",
}: CalendlyEmbedProps) {
  if (url.includes("placeholder")) {
    return (
      <div className="border border-dashed border-warm-gray bg-muted p-8 text-center text-sm text-mid-gray">
        Set <code className="font-mono">NEXT_PUBLIC_CALENDLY_URL</code> or configure the CMS `calendlyUrl` value to
        render the live scheduler.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-warm-gray">
      <InlineWidget
        url={url}
        styles={{ minWidth: "320px", height: "650px" }}
      />
    </div>
  );
}
