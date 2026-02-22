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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {title ? (
        <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
      ) : null}
      {description ? <p className="mt-3 text-slate-600">{description}</p> : null}

      <div className="mt-6">
        {trackedEmbedUrl ? (
          <div className="space-y-3">
            <iframe
              src={trackedEmbedUrl}
              className="h-[300px] w-full rounded-xl border border-slate-200"
              title="Newsletter Signup"
              onLoad={() => {
                trackEvent("newsletter_embed_loaded", { source });
              }}
            />
            <a
              href={trackedEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-medium text-blue-700 hover:text-blue-600"
              onClick={() => {
                trackEvent("newsletter_signup_started", { source });
              }}
            >
              Open signup form in a new tab
            </a>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
            <p className="text-sm text-slate-700">
              Set <code>NEXT_PUBLIC_BEEHIIV_EMBED_URL</code> to render the live signup form.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
