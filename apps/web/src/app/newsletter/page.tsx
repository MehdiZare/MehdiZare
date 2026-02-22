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
    <div className="bg-paper pb-20">
      <section className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-warm">Newsletter</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{data.headline}</h1>
          <p className="mt-5 text-lg text-white/60">{data.subheadline}</p>
          <p className="mt-4 text-sm text-white/40">{data.socialProofText}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1fr_1.4fr]">
          <article className="border border-warm-gray bg-paper p-6">
            <h2 className="font-serif text-xl text-ink">What you get</h2>
            <ul className="mt-5 space-y-3">
              {data.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-mid-gray">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent-warm" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">
              Past editions
            </h3>
            <ul className="mt-3 space-y-2">
              {data.archiveLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-sm text-accent-warm underline underline-offset-4 hover:text-ink">
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
