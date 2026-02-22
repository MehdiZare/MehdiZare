import type { Metadata } from "next";
import Link from "next/link";
import { FAQ } from "@/components/consulting/FAQ";
import { CalComTrigger } from "@/components/scheduling/CalComTrigger";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import {
  buildBreadcrumbJsonLd,
  buildFAQJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  getSiteUrl,
} from "@/lib/seo";
import { getConsultingPage } from "@/lib/strapi";
import type { ConsultingAudience, FAQ as FAQType } from "@/types/strapi";

const fallbackAudiences: ConsultingAudience[] = [
  {
    id: 1,
    title: "Financial Services Teams",
    description:
      "Production-ready AI systems for research, risk, operations, and decision support in regulated financial environments.",
  },
  {
    id: 2,
    title: "Healthcare and Life Sciences",
    description: "Deploy AI workflows where reliability, explainability, and operational safety are requirements, not nice-to-haves.",
  },
  {
    id: 3,
    title: "Enterprise AI Teams",
    description: "Move AI initiatives from pilot experiments to robust production systems with clear ownership and observability.",
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
      "Most engagements are with regulated or high-stakes teams in finance, healthcare, government, and enterprise settings that need AI outcomes they can defend to stakeholders.",
  },
  {
    id: 2,
    question: "How does an engagement begin?",
    answer:
      "We start with a 20-minute discovery call, align on target outcomes, and move into a scoped proposal.",
  },
  {
    id: 3,
    question: "Can you work with our existing team?",
    answer:
      "Yes. I typically embed into existing engineering and product teams while transferring delivery practices.",
  },
];

const consultingMetadataTitle = "Consulting";
const consultingMetadataDescription =
  "AI consulting for high-stakes teams, from strategy through production delivery.";
const schedulerSectionId = "calendly";
const schedulerAnchorHref = `#${schedulerSectionId}`;

export async function generateMetadata(): Promise<Metadata> {
  const consultingKeywords = [
    "AI consulting",
    "production AI systems",
    "LLM engineering",
    "AI architecture",
    "fractional AI leadership",
  ];

  try {
    const response = await getConsultingPage();
    const cmsData = response.data;

    return buildPageMetadata({
      pathname: "/consulting",
      title: cmsData?.title || consultingMetadataTitle,
      description: cmsData?.subtitle || consultingMetadataDescription,
      seo: cmsData?.seo,
      type: "website",
      keywords: consultingKeywords,
    });
  } catch {
    return buildPageMetadata({
      pathname: "/consulting",
      title: consultingMetadataTitle,
      description: consultingMetadataDescription,
      type: "website",
      keywords: consultingKeywords,
    });
  }
}

export default async function ConsultingPage() {
  const siteUrl = getSiteUrl();
  const fallbackData = {
    title: "AI Consulting for High-Stakes Teams",
    subtitle:
      "From strategy to production with an engineer who learns your domain before writing code.",
    audiences: fallbackAudiences,
    services: fallbackServices,
    faq: fallbackFaqs,
  };

  let data = fallbackData;
  let cmsStructuredData: unknown;

  try {
    const response = await getConsultingPage();
    const cmsData = response.data;
    cmsStructuredData = cmsData?.seo?.structuredData;

    if (cmsData) {
      data = {
        title: cmsData.title || fallbackData.title,
        subtitle: cmsData.subtitle || fallbackData.subtitle,
        audiences:
          cmsData.audiences && cmsData.audiences.length > 0
            ? cmsData.audiences
            : fallbackData.audiences,
        services: fallbackData.services,
        faq: cmsData.faq && cmsData.faq.length > 0 ? cmsData.faq : fallbackData.faq,
      };
    }
  } catch {
    // Fallback copy is used if CMS is unavailable.
  }

  const faqJsonLd = buildFAQJsonLd(
    data.faq
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }))
  );
  const consultingServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/consulting#service`,
    name: "Mehdi Zare AI Consulting",
    url: `${siteUrl}/consulting`,
    description: data.subtitle,
    provider: {
      "@id": `${siteUrl}/#person`,
    },
    serviceType: data.services.map((service) => service.name),
    audience: data.audiences.map((audience) => ({
      "@type": "Audience",
      audienceType: audience.title,
    })),
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
  };

  return (
    <div className="bg-paper pb-24">
      <CmsStructuredData
        idPrefix="consulting-cms-jsonld"
        data={cmsStructuredData}
      />
      <JsonLd
        id="consulting-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/consulting",
          title: data.title,
          description: data.subtitle,
          type: "WebPage",
        })}
      />
      <JsonLd
        id="consulting-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Consulting", path: "/consulting" },
        ])}
      />
      <JsonLd id="consulting-service-jsonld" data={consultingServiceJsonLd} />
      {faqJsonLd ? <JsonLd id="consulting-faq-jsonld" data={faqJsonLd} /> : null}
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
            <SectionHeading title="Who I Help" subtitle="Teams where domain context and AI delivery both matter" />
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
              href={schedulerAnchorHref}
              className="inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
            >
              Book a Free Discovery Call
            </a>
            <p className="mt-3 text-sm text-mid-gray">
              Prefer email?{" "}
              <Link
                href="/contact"
                className="text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
              >
                Start a conversation
              </Link>
              .
            </p>
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
                "Discovery Call (free 20 min)",
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

      <section id={schedulerSectionId} className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading title="Book a Discovery Call" subtitle="Schedule a free 20-minute session" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-10">
            <div className="border border-warm-gray bg-paper p-8 text-center">
              <p className="mx-auto max-w-2xl text-sm text-mid-gray">
                Pick a time that works for you and we&apos;ll focus on your
                goals, current blockers, and fastest path to production.
              </p>
              <CalComTrigger
                className="mt-6"
                label="Open Scheduling"
                page="consulting"
                section="booking_section"
              />
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
