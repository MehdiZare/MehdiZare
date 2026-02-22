import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { CredentialsStrip } from "@/components/home/CredentialsStrip";
import { NarrativeSection } from "@/components/home/NarrativeSection";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { TrackRecord } from "@/components/home/TrackRecord";
import { ProofOfWork } from "@/components/home/ProofOfWork";
import { WritingSection } from "@/components/home/WritingSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { getHomePage } from "@/lib/strapi";
import { buildPageMetadata, buildWebPageJsonLd } from "@/lib/seo";
import type { SEO, StrapiImage } from "@/types/strapi";

const fallbackHome = {
  heroHeadline: "I take AI from prototype to production.",
  heroSubheadline:
    "Most AI projects stall between demo and deployment. I'm a principal-level engineer who ships production systems — across finance, defense, healthcare, and enterprise. The rare engineer who learns your domain before writing a line of code.",
  heroPrimaryCtaLabel: "Let's Talk",
  heroPrimaryCtaHref: "/consulting#calendly",
  heroSecondaryCtaLabel: "How I work",
  heroSecondaryCtaHref: "/about",
  heroImage: undefined as StrapiImage | undefined,
  newsletterHeadline: "The Prototype-to-Production Briefing",
  newsletterCopy:
    "One essay per week on shipping AI systems that work in the real world. Architecture decisions, production war stories, and lessons from the domains I work in. No hype.",
};

const homeMetadataTitle = "Principal AI Engineer · CFA Charterholder";
const homeMetadataDescription =
  "Principal AI Engineer who ships production AI systems across finance, defense, healthcare, and enterprise. From prototype to production.";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const response = await getHomePage();
    const data = response.data;

    return buildPageMetadata({
      pathname: "/",
      title: homeMetadataTitle,
      description: homeMetadataDescription,
      seo: data?.seo,
      image: data?.heroImage,
      type: "website",
    });
  } catch {
    return buildPageMetadata({
      pathname: "/",
      title: homeMetadataTitle,
      description: homeMetadataDescription,
      type: "website",
    });
  }
}

export default async function Home() {
  let homeData = fallbackHome;
  let pageSeo: SEO | undefined;

  try {
    const response = await getHomePage();
    const data = response.data;
    pageSeo = data?.seo;

    if (data) {
      homeData = {
        heroHeadline: data.heroHeadline || fallbackHome.heroHeadline,
        heroSubheadline: data.heroSubheadline || fallbackHome.heroSubheadline,
        heroPrimaryCtaLabel:
          data.heroPrimaryCtaLabel || fallbackHome.heroPrimaryCtaLabel,
        heroPrimaryCtaHref: data.heroPrimaryCtaHref || fallbackHome.heroPrimaryCtaHref,
        heroSecondaryCtaLabel:
          data.heroSecondaryCtaLabel || fallbackHome.heroSecondaryCtaLabel,
        heroSecondaryCtaHref:
          data.heroSecondaryCtaHref || fallbackHome.heroSecondaryCtaHref,
        heroImage: data.heroImage,
        newsletterHeadline:
          data.newsletterHeadline || fallbackHome.newsletterHeadline,
        newsletterCopy: data.newsletterCopy || fallbackHome.newsletterCopy,
      };
    }
  } catch {
    // Keep fallback copy when CMS is unavailable.
  }

  return (
    <>
      <CmsStructuredData
        idPrefix="home-cms-jsonld"
        data={pageSeo?.structuredData}
      />
      <JsonLd
        id="home-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/",
          title: homeData.heroHeadline,
          description: homeData.heroSubheadline,
        })}
      />
      <Hero
        headline={homeData.heroHeadline}
        subheadline={homeData.heroSubheadline}
        primaryCtaLabel={homeData.heroPrimaryCtaLabel}
        primaryCtaHref={homeData.heroPrimaryCtaHref}
        secondaryCtaLabel={homeData.heroSecondaryCtaLabel}
        secondaryCtaHref={homeData.heroSecondaryCtaHref}
      />

      <AnimatedSection>
        <CredentialsStrip />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <NarrativeSection />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <ServicesGrid />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <TrackRecord />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <ProofOfWork />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <WritingSection />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <NewsletterSection
          headline={homeData.newsletterHeadline}
          copy={homeData.newsletterCopy}
        />
      </AnimatedSection>
    </>
  );
}
