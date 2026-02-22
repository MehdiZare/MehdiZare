import type { Metadata } from "next";
import Link from "next/link";
import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";
import { getNewsletterPage } from "@/lib/strapi";
import type { NavItem } from "@/types/strapi";

function normalizeBenefits(input: unknown, fallback: string[]): string[] {
  if (!Array.isArray(input)) return fallback;
  const values = input.filter((item): item is string => typeof item === "string");
  return values.length > 0 ? values : fallback;
}

const fallbackBenefits = [
  "1 Bina Print insight",
  "1 AI + finance take",
  "1 actionable framework",
];

const fallbackArchiveLinks: NavItem[] = [
  { id: 1, label: "Archive coming soon", href: "/newsletter" },
];

export const metadata: Metadata = {
  title: "Newsletter",
  description:
    "Subscribe to the weekly AI + Finance briefing from Mehdi Zare for practical insights and frameworks.",
};

export default async function NewsletterPage() {
  const fallbackData = {
    headline: "Get the weekly AI + Finance briefing",
    subheadline:
      "Every week you get one Bina Print insight, one AI/finance perspective, and one framework you can apply immediately.",
    socialProofText: "Built for investors, operators, and AI teams in financial services.",
    benefits: fallbackBenefits,
    archiveLinks: fallbackArchiveLinks,
  };

  let data = fallbackData;

  try {
    const response = await getNewsletterPage();
    const cmsData = response.data;

    if (cmsData) {
      data = {
        headline: cmsData.headline || fallbackData.headline,
        subheadline: cmsData.subheadline || fallbackData.subheadline,
        socialProofText: cmsData.socialProofText || fallbackData.socialProofText,
        benefits: normalizeBenefits(cmsData.benefits, fallbackData.benefits),
        archiveLinks:
          cmsData.archiveLinks && cmsData.archiveLinks.length > 0
            ? cmsData.archiveLinks
            : fallbackData.archiveLinks,
      };
    }
  } catch {
    // Use fallback content when CMS is unavailable.
  }

  return (
    <div className="bg-slate-50 pb-20">
      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Newsletter</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{data.headline}</h1>
          <p className="mt-5 text-lg text-slate-200">{data.subheadline}</p>
          <p className="mt-4 text-sm text-slate-300">{data.socialProofText}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1fr_1.4fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">What you get</h2>
            <ul className="mt-5 space-y-3">
              {data.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Past editions
            </h3>
            <ul className="mt-3 space-y-2">
              {data.archiveLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-sm font-medium text-blue-700 hover:text-blue-600">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <BeehiivEmbed
            source="newsletter_page"
            title="Subscribe now"
            description="Join readers who want practical insight at the intersection of AI engineering and capital markets."
          />
        </div>
      </section>
    </div>
  );
}
