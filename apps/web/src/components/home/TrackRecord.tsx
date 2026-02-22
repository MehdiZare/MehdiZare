interface TrackRecordEntry {
  org: string;
  role: string;
  description: string;
}

const entries: TrackRecordEntry[] = [
  {
    org: "Sev1Tech",
    role: "Principal AI Engineer",
    description:
      "Leading AI/ML engineering for federal programs, building production systems at the intersection of defense and intelligence.",
  },
  {
    org: "JotPsych",
    role: "AI Engineering Lead",
    description:
      "Built AI-powered clinical documentation platform from prototype to production, serving healthcare providers.",
  },
  {
    org: "Booz Allen Hamilton",
    role: "Senior AI Engineer",
    description:
      "Delivered generative AI solutions for government and enterprise clients across defense and civilian agencies.",
  },
  {
    org: "Capital One",
    role: "Quantitative Analyst",
    description:
      "Developed ML models for credit risk, fraud detection, and portfolio optimization in a regulated banking environment.",
  },
  {
    org: "Seeking Alpha",
    role: "Contributing Analyst",
    description:
      "Published equity research combining quantitative analysis with AI-driven valuation frameworks for public markets.",
  },
];

export function TrackRecord() {
  return (
    <section className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          03 &mdash; Track Record
        </p>

        <div className="mt-12 space-y-0 divide-y divide-warm-gray">
          {entries.map((entry) => (
            <div
              key={entry.org}
              className="grid grid-cols-1 gap-4 py-8 first:pt-0 last:pb-0 sm:grid-cols-3"
            >
              <div>
                <p className="font-serif text-xl text-ink">{entry.org}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-ink">{entry.role}</p>
                <p className="mt-2 text-sm leading-relaxed text-mid-gray">
                  {entry.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
