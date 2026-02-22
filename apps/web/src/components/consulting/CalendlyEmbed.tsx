"use client";

import { InlineWidget } from "react-calendly";

interface CalendlyEmbedProps {
  url?: string;
}

export function CalendlyEmbed({
  url = "https://calendly.com/placeholder",
}: CalendlyEmbedProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <InlineWidget
        url={url}
        styles={{ minWidth: "320px", height: "650px" }}
      />
    </div>
  );
}
