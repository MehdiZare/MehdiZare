"use client";

import { useMemo } from "react";
import { trackEvent } from "@/lib/analytics";

interface BeehiivEmbedProps {
  source: string;
  title?: string;
  description?: string;
}

export function BeehiivEmbed({ source, title, description }: BeehiivEmbedProps) {
  const embedUrl = process.env.NEXT_PUBLIC_BEEHIIV_EMBED_URL;

  const trackedEmbedUrl = useMemo(() => {
    if (!embedUrl) return null;
    const hasQuery = embedUrl.includes("?");
    return `${embedUrl}${hasQuery ? "&" : "?"}utm_source=${encodeURIComponent(source)}`;
  }, [embedUrl, source]);

  if (!embedUrl) return null;

  return (
    <div className="border border-warm-gray bg-paper p-6 sm:p-8">
      {title ? (
        <h3 className="font-serif text-2xl text-ink">{title}</h3>
      ) : null}
      {description ? <p className="mt-3 text-mid-gray">{description}</p> : null}

      <div className="mt-6">
        {trackedEmbedUrl ? (
          <div className="space-y-3">
            <iframe
              src={trackedEmbedUrl}
              className="h-[300px] w-full border border-warm-gray"
              title="Newsletter Signup"
              onLoad={() => {
                trackEvent("newsletter_embed_loaded", { source });
              }}
            />
            <a
              href={trackedEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm text-accent-warm underline underline-offset-4 hover:text-ink"
              onClick={() => {
                trackEvent("newsletter_signup_started", { source });
              }}
            >
              Open signup form in a new tab
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
