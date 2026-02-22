"use client";

import { InlineWidget } from "react-calendly";

interface CalendlyEmbedProps {
  url?: string;
}

export function CalendlyEmbed({
  url = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/placeholder",
}: CalendlyEmbedProps) {
  if (url.includes("placeholder")) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
        Set <code>NEXT_PUBLIC_CALENDLY_URL</code> or configure the CMS `calendlyUrl` value to
        render the live scheduler.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <InlineWidget
        url={url}
        styles={{ minWidth: "320px", height: "650px" }}
      />
    </div>
  );
}
