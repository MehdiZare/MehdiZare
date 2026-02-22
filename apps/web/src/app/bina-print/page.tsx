import type { Metadata } from "next";
import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";
import { TickerLookup } from "@/components/bina/TickerLookup";
import { getBinaPrintPage } from "@/lib/strapi";
import type { BinaMover, BinaStep } from "@/types/strapi";

const fallbackSteps: BinaStep[] = [
  {
    id: 1,
    title: "We analyze fundamentals",
    description:
      "AI agents process financial statements, earnings calls, and SEC filings into structured signals.",
  },
  {
    id: 2,
    title: "We score companies 0-100",
    description:
      "The Bina Score summarizes investment quality with explainable sub-score components.",
  },
  {
    id: 3,
    title: "We match to your profile",
    description:
      "Scores are interpreted by risk tolerance, sector preference, and time horizon.",
  },
];

const fallbackMovers: BinaMover[] = [
  { id: 1, ticker: "MSFT", company: "Microsoft", score: 88, scoreChange: 4.2 },
  { id: 2, ticker: "NVDA", company: "NVIDIA", score: 91, scoreChange: 3.7 },
  { id: 3, ticker: "AMZN", company: "Amazon", score: 82, scoreChange: 2.9 },
  { id: 4, ticker: "JPM", company: "JPMorgan", score: 79, scoreChange: 2.5 },
  { id: 5, ticker: "AAPL", company: "Apple", score: 84, scoreChange: 2.1 },
];

export const metadata: Metadata = {
  title: "Bina Print",
  description:
    "Bina Print is an AI-powered company scoring system that helps investors evaluate businesses with CFA-level rigor.",
};

export default async function BinaPrintPage() {
  const fallbackData = {
    heroHeadline: "Bina Print - A Zestimate for Stocks",
    heroSubheadline:
      "AI-powered company scoring that helps match investment opportunities to your profile.",
    searchPlaceholder: "Look up any company ticker (e.g., MSFT)",
    howItWorks: fallbackSteps,
    topMovers: fallbackMovers,
    exampleTicker: "MSFT",
    exampleOverallScore: 88,
    exampleSubScores: {
      fundamentals: 90,
      sentiment: 83,
      momentum: 86,
      risk: 81,
    } as Record<string, number>,
    methodologySummary:
      "Bina Print combines structured financial analysis with production-tested AI workflows to produce transparent scores. Methodology prioritizes explainability over black-box outputs.",
    emailGateHeadline: "Get your free personalized Bina Score report",
    emailGateCopy:
      "Join the list to receive new score updates, methodology notes, and product access invites.",
  };

  let data: typeof fallbackData = fallbackData;

  try {
    const response = await getBinaPrintPage();
    const cmsData = response.data;

    if (cmsData) {
      data = {
        heroHeadline: cmsData.heroHeadline || fallbackData.heroHeadline,
        heroSubheadline: cmsData.heroSubheadline || fallbackData.heroSubheadline,
        searchPlaceholder: cmsData.searchPlaceholder || fallbackData.searchPlaceholder,
        howItWorks:
          cmsData.howItWorks && cmsData.howItWorks.length > 0
            ? cmsData.howItWorks
            : fallbackData.howItWorks,
        topMovers:
          cmsData.topMovers && cmsData.topMovers.length > 0
            ? cmsData.topMovers
            : fallbackData.topMovers,
        exampleTicker: cmsData.exampleTicker || fallbackData.exampleTicker,
        exampleOverallScore:
          cmsData.exampleOverallScore || fallbackData.exampleOverallScore,
        exampleSubScores: cmsData.exampleSubScores || fallbackData.exampleSubScores,
        methodologySummary:
          cmsData.methodologySummary || fallbackData.methodologySummary,
        emailGateHeadline:
          cmsData.emailGateHeadline || fallbackData.emailGateHeadline,
        emailGateCopy: cmsData.emailGateCopy || fallbackData.emailGateCopy,
      };
    }
  } catch {
    // Keep fallback for local development without CMS.
  }

  return (
    <div className="bg-paper pb-20">
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
              Built by a CFA Charterholder using production AI systems.
            </p>
          </article>
        </div>
      </section>

      <section className="pb-10 pt-6">
        <div className="mx-auto max-w-4xl px-6">
          <BeehiivEmbed
            source="bina_print_email_gate"
            title={data.emailGateHeadline}
            description={data.emailGateCopy}
          />
        </div>
      </section>
    </div>
  );
}
