"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface TickerLookupProps {
  placeholder: string;
}

export function TickerLookup({ placeholder }: TickerLookupProps) {
  const [ticker, setTicker] = useState("");
  const [submittedTicker, setSubmittedTicker] = useState<string | null>(null);

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const normalized = ticker.trim().toUpperCase();
          if (!normalized) return;

          setSubmittedTicker(normalized);
          trackEvent("bina_lookup_requested", {
            page: "bina_print",
            ticker: normalized,
          });
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={ticker}
          onChange={(event) => setTicker(event.target.value)}
          placeholder={placeholder}
          className="w-full border border-warm-gray bg-paper px-4 py-3 text-ink outline-none focus:border-ink focus:ring-1 focus:ring-ink"
        />
        <button
          type="submit"
          className="bg-paper px-6 py-3 text-sm font-medium text-ink border border-paper transition hover:bg-warm-gray"
        >
          Lookup Score
        </button>
      </form>

      {submittedTicker ? (
        <p className="mt-3 text-sm text-paper/70">
          {submittedTicker} captured. Live scoring API is coming in Phase 2.
        </p>
      ) : null}
    </div>
  );
}
