import type { Metadata } from "next";
import { FAQ } from "@/components/consulting/FAQ";
import { CalendlyEmbed } from "@/components/consulting/CalendlyEmbed";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { getConsultingPage } from "@/lib/strapi";
import type { ConsultingAudience, FAQ as FAQType } from "@/types/strapi";

const fallbackAudiences: ConsultingAudience[] = [
  {
    id: 1,
    title: "Asset Managers / Hedge Funds",
    description:
      "Production-ready AI systems for alpha generation with CFA-level rigor and risk framing.",
  },
  {
    id: 2,
    title: "Fintech Startups",
    description: "Build AI products with governance and compliance built in from day one.",
  },
  {
    id: 3,
    title: "Enterprise AI Teams",
    description: "Move financial AI from pilot experiments to robust production systems.",
  },
  {
    id: 4,
    title: "Government / Defense",
    description: "AI-powered threat and intelligence workflows under strict constraints.",
  },
];

const fallbackServices = [
  {
    id: 1,
    name: "Advisory",
    scope: "AI strategy, architecture review, and vendor evaluation.",
  },
  {
    id: 2,
    name: "Hands-On Implementation",
    scope: "Hands-on development with strategic leadership and team mentoring.",
  },
  {
    id: 3,
    name: "Fractional AI Lead",
    scope: "Embedded AI leadership for mission-critical programs with delivery ownership.",
  },
];

const fallbackFaqs: FAQType[] = [
  {
    id: 1,
    question: "What types of organizations do you work with?",
    answer:
      "Most engagements are with financial institutions, fintech companies, or regulated teams that need AI outcomes they can defend to stakeholders.",
  },
  {
    id: 2,
    question: "How does an engagement begin?",
    answer:
      "We start with a 30-minute discovery call, align on target outcomes, and move into a scoped proposal.",
  },
  {
    id: 3,
    question: "Can you work with our existing team?",
    answer:
      "Yes. I typically embed into existing engineering and product teams while transferring delivery practices.",
  },
];

export const metadata: Metadata = {
  title: "Consulting",
  description:
    "AI consulting for financial institutions from strategy through production delivery.",
};

export default async function ConsultingPage() {
  const fallbackData = {
    title: "AI Consulting for Financial Institutions",
    subtitle:
      "From strategy to production with someone who speaks both code and capital markets.",
    audiences: fallbackAudiences,
    services: fallbackServices,
    calendlyUrl: "https://calendly.com/placeholder",
    faq: fallbackFaqs,
    leadMagnetTitle: "AI Readiness Scorecard for Financial Institutions",
    leadMagnetDescription:
      "Download the checklist used to evaluate whether a financial AI initiative is ready for production.",
  };

  let data = fallbackData;

  try {
    const response = await getConsultingPage();
    const cmsData = response.data;

    if (cmsData) {
      data = {
        title: cmsData.title || fallbackData.title,
        subtitle: cmsData.subtitle || fallbackData.subtitle,
        audiences:
          cmsData.audiences && cmsData.audiences.length > 0
            ? cmsData.audiences
            : fallbackData.audiences,
        services: fallbackData.services,
        calendlyUrl: cmsData.calendlyUrl || fallbackData.calendlyUrl,
        faq: cmsData.faq && cmsData.faq.length > 0 ? cmsData.faq : fallbackData.faq,
        leadMagnetTitle: cmsData.leadMagnetTitle || fallbackData.leadMagnetTitle,
        leadMagnetDescription:
          cmsData.leadMagnetDescription || fallbackData.leadMagnetDescription,
      };
    }
  } catch {
    // Fallback copy is used if CMS is unavailable.
  }

  return (
    <div className="bg-paper pb-24">
      <section className="pb-16 pt-10">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Consulting</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">{data.title}</h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-mid-gray">{data.subtitle}</p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading title="Who I Help" subtitle="Teams where finance context and AI delivery both matter" />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {data.audiences.map((audience, index) => (
              <AnimatedSection key={audience.id} delay={index * 0.08}>
                <article className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-serif text-lg text-ink">{audience.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mid-gray">{audience.description}</p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading title="How I Can Help" subtitle="Flexible engagement models tailored to your needs" />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {data.services.map((service, index) => (
              <AnimatedSection key={service.id} delay={index * 0.1}>
                <div className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-serif text-lg text-ink">{service.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mid-gray">{service.scope}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.3} className="mt-10 text-center">
            <a
              href="#calendly"
              className="inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
            >
              Book a Free Discovery Call
            </a>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading title="How It Works" subtitle="Simple process designed for executive clarity and execution speed" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                "Discovery Call (free 30 min)",
                "Custom Proposal",
                "Engagement Kickoff",
              ].map((step, index) => (
                <div key={step} className="border border-warm-gray bg-paper p-5 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-warm">Step {index + 1}</p>
                  <p className="mt-3 text-sm font-medium text-ink">{step}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section id="calendly" className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading title="Book a Discovery Call" subtitle="Schedule a free 30-minute session" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-10">
            <CalendlyEmbed url={data.calendlyUrl} />
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <div className="border border-warm-gray bg-paper p-7">
              <h3 className="font-serif text-2xl text-ink">{data.leadMagnetTitle}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mid-gray">{data.leadMagnetDescription}</p>
              <a
                href="/newsletter"
                className="mt-5 inline-flex bg-ink px-6 py-2.5 text-sm font-medium text-paper transition hover:bg-ink/85"
              >
                Request the Scorecard
              </a>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="pt-4">
        <div className="mx-auto max-w-3xl px-6">
          <AnimatedSection>
            <SectionHeading title="Frequently Asked Questions" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <div className="border border-warm-gray bg-paper px-6">
              <FAQ faqs={data.faq} />
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
