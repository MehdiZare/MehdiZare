import { Hero } from "@/components/home/Hero";
import { PositioningStatement } from "@/components/home/PositioningStatement";
import { CredentialsBanner } from "@/components/home/CredentialsBanner";
import { FeaturedPosts } from "@/components/home/FeaturedPosts";
import { WhatIDoGrid } from "@/components/home/WhatIDoGrid";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { getHomePage } from "@/lib/strapi";
import type {
  HomeCredibilityItem,
  HomeFeaturedOnItem,
  HomeValueCard,
  StrapiImage,
} from "@/types/strapi";

const fallbackHome = {
  heroHeadline: "AI That Thinks Like an Analyst",
  heroSubheadline:
    "CFA Charterholder x Principal AI Engineer - Building the bridge between Wall Street and Silicon Valley so financial institutions can move from AI pilots to production impact.",
  heroPrimaryCtaLabel: "Work With Me",
  heroPrimaryCtaHref: "/consulting#calendly",
  heroSecondaryCtaLabel: "Try Bina Print Free",
  heroSecondaryCtaHref: "/bina-print",
  heroImage: undefined as StrapiImage | undefined,
  credibilityItems: [
    { id: 1, organization: "CFA Institute", detail: "CFA Charterholder" },
    { id: 2, organization: "Capital One", detail: "Quant + AI" },
    { id: 3, organization: "Booz Allen", detail: "GenAI Delivery" },
    { id: 4, organization: "Sev1Tech", detail: "Principal AI" },
    { id: 5, organization: "AWS", detail: "Solutions Architect" },
    { id: 6, organization: "Clearance", detail: "Active Secret" },
  ] as HomeCredibilityItem[],
  featuredOnItems: [
    { id: 1, platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
    { id: 2, platform: "Medium", url: "https://medium.com/@mehdi-zare" },
    { id: 3, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
  ] as HomeFeaturedOnItem[],
  whatIDoCards: [
    {
      id: 1,
      title: "AI + Finance Consulting",
      description: "From pilot to production for financial AI systems with risk, governance, and execution discipline.",
      ctaLabel: "View Consulting",
      ctaHref: "/consulting",
    },
    {
      id: 2,
      title: "Bina Print",
      description: "A Zestimate for stocks. AI-powered company scoring designed for practical investment decisions.",
      ctaLabel: "Explore Bina Print",
      ctaHref: "/bina-print",
    },
    {
      id: 3,
      title: "Thought Leadership",
      description: "Deep analysis on financial AI agents, production LLM systems, and modern capital markets workflows.",
      ctaLabel: "Read the Blog",
      ctaHref: "/blog",
    },
  ] as HomeValueCard[],
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
        credibilityItems:
          data.credibilityItems && data.credibilityItems.length > 0
            ? data.credibilityItems
            : fallbackHome.credibilityItems,
        featuredOnItems:
          data.featuredOnItems && data.featuredOnItems.length > 0
            ? data.featuredOnItems
            : fallbackHome.featuredOnItems,
        whatIDoCards:
          data.whatIDoCards && data.whatIDoCards.length > 0
            ? data.whatIDoCards
            : fallbackHome.whatIDoCards,
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
        <CredentialsBanner
          credibilityItems={homeData.credibilityItems}
          featuredOnItems={homeData.featuredOnItems}
        />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <PositioningStatement />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <WhatIDoGrid cards={homeData.whatIDoCards} />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <FeaturedPosts />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <NewsletterCTA
          headline={homeData.newsletterHeadline}
          copy={homeData.newsletterCopy}
        />
      </AnimatedSection>
    </>
  );
}
