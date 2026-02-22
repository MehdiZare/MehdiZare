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
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Lookup Score
        </button>
      </form>

      {submittedTicker ? (
        <p className="mt-3 text-sm text-slate-600">
          {submittedTicker} captured. Live scoring API is coming in Phase 2.
        </p>
      ) : null}
    </div>
  );
}
