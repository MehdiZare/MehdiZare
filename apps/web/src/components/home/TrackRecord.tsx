interface TrackRecordEntry {
  org: string;
  role: string;
  description: string;
}

const entries: TrackRecordEntry[] = [
  {
    org: "Sev1Tech",
    role: "Principal AI Engineer / Cloud Architect",
    description:
      "GenAI systems for CISA cybersecurity operations. Databricks-first pipelines, model observability, and threat-informed monitoring in production federal environments.",
  },
  {
    org: "JotPsych",
    role: "Principal AI Engineer",
    description:
      "Built a generative AI platform for clinical mental health documentation — ASR, LLM reasoning, and real-time transcription from prototype to production.",
  },
  {
    org: "Booz Allen",
    role: "Senior AI/ML Engineer",
    description:
      "Delivered containerized GenAI solutions with LangChain and AWS Bedrock for government and enterprise clients at scale.",
  },
  {
    org: "Capital One",
    role: "Quantitative Analysis Manager",
    description:
      "ML-driven liquidity forecasting. Time series, TensorFlow, NLP — bridging finance teams, data engineering, and compliance. This is where I earned the CFA.",
  },
  {
    org: "Adviser",
    role: "Co-Founder",
    description:
      "Built a virtual investment adviser for underrepresented groups — generative AI that creates personalized financial visualizations from natural conversation.",
  },
];

export function TrackRecord() {
  return (
    <section className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          03 &mdash; Track Record
        </p>

        <h2 className="mt-6 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Shipped across industries. Deep in each one.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mid-gray">
          Principal-level AI engineering across four regulated, high-stakes domains. Each
          required learning the business &mdash; not just the tech stack.
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
