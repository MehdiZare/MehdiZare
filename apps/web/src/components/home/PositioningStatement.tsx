export function PositioningStatement() {
  return (
    <section className="bg-slate-50 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          The Bridge Between Wall Street and Silicon Valley
        </h2>

        <p className="mt-8 text-lg leading-relaxed text-slate-700 sm:text-xl">
          Most financial AI initiatives break at handoff points: engineering can ship models,
          but misses market context; finance teams know the domain, but cannot operationalize AI.
          I operate across both layers, from investment logic to production architecture, so teams
          can move from pilot decks to deployed systems that decision-makers trust.
        </p>

        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">CFA + Principal AI Engineering</p>
            <p className="mt-2 text-sm text-slate-600">
              Rare dual-domain background for regulated, high-stakes financial AI work.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">From Strategy to Production</p>
            <p className="mt-2 text-sm text-slate-600">
              Hands-on execution in fintech, defense, healthcare, and enterprise environments.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
