import type { Metadata } from "next";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { FAQ } from "@/components/consulting/FAQ";
import { CalComTrigger } from "@/components/scheduling/CalComTrigger";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import {
  buildConsultingFallback,
  consultingDescription,
  consultingMetadataTitle,
} from "@/content/fallbacks";
import {
  buildBreadcrumbJsonLd,
  buildFAQJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  getSiteUrl,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";

const schedulerSectionId = "book";
const schedulerAnchorHref = `#${schedulerSectionId}`;
const serviceArea = "Remote, anywhere";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  // The page title and the <h1> are different strings on purpose. Metadata
  // uses the search title; the heading uses the same fallback the page renders.
  // #100 pinned them together when both were one CMS title. They still have to
  // come from this module, not a short hardcoded "Consulting".
  void siteProfile;
  const consultingKeywords = [
    "AI consulting",
    "AI agents",
    "agent workflow",
    "fractional CTO",
    "startup AI",
  ];

  return buildPageMetadata({
    pathname: "/consulting",
    title: consultingMetadataTitle,
    description: consultingDescription,
    type: "website",
    keywords: consultingKeywords,
  });
}

export default async function ConsultingPage() {
  const siteProfile = await getSiteProfile();
  const siteUrl = getSiteUrl();
  const data = buildConsultingFallback(siteProfile);

  const faqJsonLd = buildFAQJsonLd(
    data.faq
      .filter((faq) => faq.question && faq.answer)
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }))
  );
  const providerAddress =
    siteProfile.author.addressLocality ||
    siteProfile.author.addressRegion ||
    siteProfile.author.addressCountry
      ? {
          "@type": "PostalAddress",
          addressLocality: siteProfile.author.addressLocality,
          addressRegion: siteProfile.author.addressRegion,
          addressCountry: siteProfile.author.addressCountry,
        }
      : undefined;
  const consultingServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteUrl}/consulting#service`,
    name: `${siteProfile.siteName} AI Consulting`,
    url: `${siteUrl}/consulting`,
    description: consultingDescription,
    provider: {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: siteProfile.authorName,
      url: siteProfile.author.websiteUrl,
      jobTitle: siteProfile.authorRole,
      sameAs:
        siteProfile.author.sameAs.length > 0
          ? siteProfile.author.sameAs.map((socialLink) => socialLink.url)
          : undefined,
      address: providerAddress,
    },
    address: providerAddress,
    serviceType: data.services.map((service) => service.name),
    audience: data.audiences.map((audience) => ({
      "@type": "Audience",
      audienceType: audience.title,
    })),
    areaServed: serviceArea,
    availableLanguage: ["English"],
    mainEntityOfPage: {
      "@id": `${siteUrl}/consulting#webpage`,
    },
    knowsAbout: siteProfile.knowsAbout,
  };

  return (
    <div className="bg-paper pb-24">
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
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">
              Service area: {serviceArea}
            </p>
            <p className="mt-4 max-w-3xl text-sm text-mid-gray">
              Looking for the{" "}
              <TrackedLink
                href="/ai-engineer"
                eventName="funnel_cta_click"
                eventProperties={{
                  section: "consulting_hero",
                  cta_label: "AI engineer landing",
                  destination: "/ai-engineer",
                  interaction_type: "link_click",
                }}
                className="text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
              >
                AI engineer
              </TrackedLink>{" "}
              profile instead?
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="What I run myself"
              subtitle="No client logos or results here until there are real ones I can back up."
            />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {data.proof.map((item, index) => (
              <AnimatedSection key={item.id} delay={index * 0.08}>
                <article className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-serif text-lg text-ink">
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 transition-colors hover:text-mid-gray"
                    >
                      {item.name}
                    </a>
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-mid-gray">{item.description}</p>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading title="Who it's for" subtitle="Founders and small teams. Fully remote." />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
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
        <div className="mx-auto max-w-3xl px-6">
          <AnimatedSection>
            <SectionHeading title="Not a fit" />
          </AnimatedSection>
          <AnimatedSection delay={0.1} className="mt-8">
            <ul className="space-y-3 border border-warm-gray bg-paper p-6">
              {data.notAFit.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-mid-gray">
                  {item}
                </li>
              ))}
            </ul>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6">
          <AnimatedSection>
            <SectionHeading title="How I can help" subtitle="Three offers. Remote." />
          </AnimatedSection>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {data.services.map((service, index) => (
              <AnimatedSection key={service.id} delay={index * 0.1}>
                <div className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-serif text-lg text-ink">{service.name}</h3>
                  <p className="mt-3 text-sm font-medium text-ink">{service.scope}</p>
                  <ul className="mt-4 space-y-3">
                    {service.details.map((detail) => (
                      <li key={detail} className="text-sm leading-relaxed text-mid-gray">
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.3} className="mt-10 text-center">
            <TrackedAnchor
              href={schedulerAnchorHref}
              eventName="funnel_cta_click"
              eventProperties={{
                section: "consulting_mid_cta",
                cta_label: siteProfile.primaryCtaLabel,
                destination: schedulerAnchorHref,
                interaction_type: "link_click",
              }}
              className="inline-flex bg-ink px-8 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
            >
              {siteProfile.primaryCtaLabel}
            </TrackedAnchor>
            <p className="mt-3 text-sm text-mid-gray">
              Prefer email?{" "}
              <TrackedLink
                href="/contact"
                eventName="funnel_contact_intent"
                eventProperties={{
                  section: "consulting_mid_cta",
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

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading title="How it works" subtitle="Remote, from the first call." />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-3">
              {data.howItWorks.map((step, index) => (
                <div key={step} className="border border-warm-gray bg-paper p-5 text-center">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-warm">Step {index + 1}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-ink">{step}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section id={schedulerSectionId} className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="Book a free 20-minute call"
              subtitle="We talk about one workflow and whether I can help."
            />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-10">
            <div className="border border-warm-gray bg-paper p-8 text-center">
              <p className="mx-auto max-w-2xl text-sm text-mid-gray">
                Pick a time that works for you. The call is free, and the work after it is remote.
              </p>
              <CalComTrigger
                className="mt-6"
                label="Open Scheduling"
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
