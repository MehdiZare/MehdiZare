import { Hero } from "@/components/home/Hero";
import { CredentialsStrip } from "@/components/home/CredentialsStrip";
import { NarrativeSection } from "@/components/home/NarrativeSection";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { TrackRecord } from "@/components/home/TrackRecord";
import { ProofOfWork } from "@/components/home/ProofOfWork";
import { WritingSection } from "@/components/home/WritingSection";
import { NewsletterSection } from "@/components/home/NewsletterSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { getHomePage } from "@/lib/strapi";
import type { StrapiImage } from "@/types/strapi";

const fallbackHome = {
  heroHeadline: "I help financial institutions ship AI that actually works.",
  heroSubheadline:
    "CFA Charterholder and Principal AI Engineer bridging the gap between Wall Street domain expertise and Silicon Valley engineering — so your AI initiatives move from pilot decks to production systems.",
  heroPrimaryCtaLabel: "Work With Me",
  heroPrimaryCtaHref: "/consulting#calendly",
  heroSecondaryCtaLabel: "See my work",
  heroSecondaryCtaHref: "/bina-print",
  heroImage: undefined as StrapiImage | undefined,
  newsletterHeadline: "Get the weekly AI + Finance briefing",
  newsletterCopy:
    "One Bina Print insight, one AI/finance take, and one actionable framework. Every week.",
};

export default async function Home() {
  let homeData = fallbackHome;

  try {
    const response = await getHomePage();
    const data = response.data;

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
