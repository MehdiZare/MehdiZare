import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TickerLookup } from "@/components/bina/TickerLookup";
import { JsonLd } from "@/components/seo/JsonLd";
import { fallbackBinaPrintData } from "@/content/fallbacks";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import {
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";

const binaPrintMetadataTitle = "Bina Print";

export async function generateMetadata(): Promise<Metadata> {
  if (!isBinaPrintEnabled()) {
    return buildNoIndexMetadata("Bina Print Not Found");
  }

  return buildPageMetadata({
    pathname: "/bina-print",
    title: binaPrintMetadataTitle,
    description: fallbackBinaPrintData.heroSubheadline,
    type: "website",
    keywords: [
      "AI scoring system",
      "production AI product",
      "financial AI",
      "LLM workflows",
    ],
  });
}

export default async function BinaPrintPage() {
  if (!isBinaPrintEnabled()) {
    notFound();
  }

  const siteProfile = await getSiteProfile();
  const data = fallbackBinaPrintData;

  return (
    <div className="bg-paper pb-20">
      <JsonLd
        id="bina-print-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/bina-print",
          title: data.heroHeadline,
          description: data.heroSubheadline,
        })}
      />
      <JsonLd
        id="bina-print-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Bina Print", path: "/bina-print" },
        ])}
      />
      <section className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-warm">
            AI-Powered Investment Scoring
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{data.heroHeadline}</h1>
          <p className="mt-5 max-w-3xl text-lg text-white/60">{data.heroSubheadline}</p>
          <div className="mt-8 max-w-2xl">
            <TickerLookup placeholder={data.searchPlaceholder} />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-3xl text-ink">How It Works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {data.howItWorks.map((step, index) => (
              <article key={step.id} className="border border-warm-gray bg-paper p-6">
                <p className="font-mono text-xs text-accent-warm">Step {index + 1}</p>
                <h3 className="mt-2 font-serif text-lg text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-mid-gray">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-serif text-3xl text-ink">Top Movers This Week</h2>
          <div className="mt-8 overflow-hidden border border-warm-gray bg-paper">
            <table className="w-full text-left">
              <thead className="bg-muted font-mono text-xs uppercase tracking-[0.15em] text-mid-gray">
                <tr>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Bina Score</th>
                  <th className="px-4 py-3">Weekly Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-gray text-sm text-mid-gray">
                {data.topMovers.map((mover) => (
                  <tr key={mover.id}>
                    <td className="px-4 py-3 font-medium text-ink">{mover.ticker}</td>
                    <td className="px-4 py-3">{mover.company}</td>
                    <td className="px-4 py-3">{mover.score ?? "-"}</td>
                    <td className="px-4 py-3 text-accent-warm">
                      {typeof mover.scoreChange === "number"
                        ? `${mover.scoreChange > 0 ? "+" : ""}${mover.scoreChange}`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2">
          <article className="border border-warm-gray bg-paper p-7">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">Score Card Example</p>
            <h3 className="mt-3 font-serif text-2xl text-ink">{data.exampleTicker} &mdash; Overall {data.exampleOverallScore}</h3>

            <div className="mt-6 space-y-4">
              {Object.entries(data.exampleSubScores).map(([label, value]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink">{label}</span>
                    <span className="font-mono text-mid-gray">{value}</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-warm-gray">
                    <div className="h-1.5 rounded-full bg-ink" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-warm-gray bg-paper p-7">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">Methodology Overview</p>
            <p className="mt-4 text-sm leading-relaxed text-mid-gray">{data.methodologySummary}</p>
            <p className="mt-5 text-sm font-medium text-ink">
              Built by {siteProfile.credentialLine} using production AI systems.
            </p>
            <a
              href="/consulting"
              className="mt-4 inline-block text-sm text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
            >
              Need this rigor in your domain? Explore consulting.
            </a>
          </article>
        </div>
      </section>

    </div>
  );
}
