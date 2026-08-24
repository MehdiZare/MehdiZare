import type { Metadata } from "next";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { FAQ } from "@/components/consulting/FAQ";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import {
  aiEngineerKeywords,
  aiEngineerMetadataTitle,
  buildAiEngineerFallback,
} from "@/content/fallbacks/ai-engineer";
import {
  buildBreadcrumbJsonLd,
  buildFAQJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  getSiteUrl,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";

const pathname = "/ai-engineer";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const data = buildAiEngineerFallback(siteProfile);

  return buildPageMetadata({
    pathname,
    title: aiEngineerMetadataTitle,
    description: data.description,
    type: "website",
    keywords: aiEngineerKeywords,
  });
}

export default async function AiEngineerPage() {
  const siteProfile = await getSiteProfile();
  const siteUrl = getSiteUrl();
  const data = buildAiEngineerFallback(siteProfile);
  const schedulerHref = siteProfile.bookCallHref;

  const faqJsonLd = buildFAQJsonLd(
    data.faq
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }))
  );

  const webpageJsonLd = {
    ...buildWebPageJsonLd({
      pathname,
      title: data.headline,
      description: data.description,
      type: "WebPage",
    }),
    about: {
      "@id": `${siteUrl}/#person`,
    },
    keywords: aiEngineerKeywords.join(", "),
  };

  return (
    <div className="bg-paper pb-24">
      <JsonLd id="ai-engineer-webpage-jsonld" data={webpageJsonLd} />
      <JsonLd
        id="ai-engineer-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "AI Engineer", path: pathname },
        ])}
      />
      {faqJsonLd ? <JsonLd id="ai-engineer-faq-jsonld" data={faqJsonLd} /> : null}

      <section className="pb-16 pt-10">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
              {siteProfile.credentialLine}
            </p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              {data.headline}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-mid-gray">
              {data.subtitle}
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedLink
                href={schedulerHref}
                eventName="funnel_cta_click"
                eventProperties={{
                  section: "ai_engineer_hero",
                  cta_label: siteProfile.primaryCtaLabel,
                  destination: schedulerHref,
                  interaction_type: "link_click",
                }}
                className="inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
              >
                {siteProfile.primaryCtaLabel}
              </TrackedLink>
              <TrackedLink
                href="/consulting"
                eventName="funnel_cta_click"
                eventProperties={{
                  section: "ai_engineer_hero",
                  cta_label: "See consulting",
                  destination: "/consulting",
                  interaction_type: "link_click",
                }}
                className="rounded-sm border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              >
                See consulting
              </TrackedLink>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="What this AI engineer does"
              subtitle="Systems that have to run in finance, not just look good in a demo"
            />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {data.capabilities.map((capability, index) => (
              <AnimatedSection key={capability.id} delay={index * 0.08}>
                <article className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-serif text-lg text-ink">{capability.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mid-gray">
                    {capability.description}
                  </p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="Finance is the domain"
              subtitle="The CFA is not decoration — it is how the work stays honest"
            />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-10">
            <div className="mx-auto max-w-3xl space-y-5 text-lg leading-relaxed text-mid-gray">
              <p>
                Plenty of teams can stand up a chatbot. Fewer can put a model next
                to a funding forecast, a research workflow, or a risk process and
                have it survive contact with operations.
              </p>
              <p>
                I trained as a physicist, then earned an MBA in finance and the CFA
                charter. That combination is the job: learn the domain first, then
                engineer the system that ships.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="Selected finance work"
              subtitle="Proof that the AI engineer title is earned in markets, not slides"
            />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {data.proofPoints.map((point, index) => (
              <AnimatedSection key={point.id} delay={index * 0.08}>
                <article className="border border-warm-gray bg-paper p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-warm">
                    {point.role}
                  </p>
                  <h3 className="mt-3 font-serif text-lg text-ink">{point.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mid-gray">
                    {point.description}
                  </p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="Need an AI engineer on a live problem?"
              subtitle={siteProfile.contactPrompt}
            />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-10 text-center">
            <TrackedLink
              href={schedulerHref}
              eventName="funnel_cta_click"
              eventProperties={{
                section: "ai_engineer_mid_cta",
                cta_label: siteProfile.primaryCtaLabel,
                destination: schedulerHref,
                interaction_type: "link_click",
              }}
              className="inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
            >
              {siteProfile.primaryCtaLabel}
            </TrackedLink>
            <p className="mt-3 text-sm text-mid-gray">
              Prefer email?{" "}
              <TrackedLink
                href="/contact"
                eventName="funnel_contact_intent"
                eventProperties={{
                  section: "ai_engineer_mid_cta",
                  cta_label: "Start a conversation",
                  destination: "/contact",
                  interaction_type: "link_click",
                }}
                className="text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
              >
                Start a conversation
              </TrackedLink>
              .
            </p>
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
