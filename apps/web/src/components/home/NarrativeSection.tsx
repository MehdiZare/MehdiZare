export function NarrativeSection() {
  return (
    <section className="bg-paper py-24">
      <div className="mx-auto max-w-[680px] px-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          01 &mdash; The Problem
        </p>

        <h2 className="mt-6 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          Most AI projects in financial services never make it to production.
        </h2>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-mid-gray">
          <p>
            <strong className="text-ink">70% of enterprise AI initiatives fail</strong> before
            they deliver business value. The gap is not technical capability &mdash; it&rsquo;s
            the handoff between engineering teams that can ship models and domain experts who
            understand the stakes.
          </p>
          <p>
            Engineering can build sophisticated systems, but without deep market context the
            outputs feel academic. Finance teams know what good looks like, but
            can&rsquo;t translate that into production architecture.{" "}
            <strong className="text-ink">You need someone who operates across both layers</strong>
            &mdash; from investment logic to deployment pipelines &mdash; so the system actually
            earns trust from the people who sign off on it.
          </p>
        </div>
      </div>
    </section>
  );
}
