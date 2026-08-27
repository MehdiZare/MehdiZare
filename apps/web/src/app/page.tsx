import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { ClientLogos } from "@/components/home/ClientLogos";
import { CredentialsStrip } from "@/components/home/CredentialsStrip";
import { NarrativeSection } from "@/components/home/NarrativeSection";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { TrackRecord } from "@/components/home/TrackRecord";
import { ProofOfWork } from "@/components/home/ProofOfWork";
import { WritingSection } from "@/components/home/WritingSection";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeFallback, splitIndustries } from "@/content/fallbacks";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import { getSiteProfile } from "@/lib/site-profile";
import { buildPageMetadata, buildWebPageJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  // Lead with the name so the homepage ranks for the owner's name query
  // (was authorRole-only → "mehdi zare" ranked ~p11). See MehdiZare#8.
  const homeMetadataTitle =
    `${siteProfile.siteName} — ${siteProfile.authorRole} · CFA Charterholder`;

  return buildPageMetadata({
    pathname: "/",
    title: homeMetadataTitle,
    description: siteProfile.siteDescription,
    type: "website",
  });
}

export default async function Home() {
  const showBinaPrint = isBinaPrintEnabled();
  const siteProfile = await getSiteProfile();
  const homeData = buildHomeFallback(siteProfile);

  return (
    <>
      <JsonLd
        id="home-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/",
          title: homeData.heroHeadline,
          description: homeData.heroSubheadline,
        })}
      />
      <Hero
        credentialLine={siteProfile.credentialLine}
        highlightPhrase={siteProfile.positioningHighlight}
        headline={homeData.heroHeadline}
        subheadline={homeData.heroSubheadline}
        primaryCtaLabel={homeData.heroPrimaryCtaLabel}
        primaryCtaHref={homeData.heroPrimaryCtaHref}
        secondaryCtaLabel={homeData.heroSecondaryCtaLabel}
        secondaryCtaHref={homeData.heroSecondaryCtaHref}
      />

      <ClientLogos items={splitIndustries(siteProfile.industriesLine)} />

      <AnimatedSection>
        <CredentialsStrip
          role={siteProfile.authorRole}
          industriesLine={siteProfile.industriesLine}
          credentialLine={siteProfile.credentialLine}
        />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <NarrativeSection
          industriesLine={siteProfile.industriesLine}
          highlightPhrase={siteProfile.positioningHighlight}
        />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <ServicesGrid positioningHeadline={siteProfile.positioningHeadline} />
      </AnimatedSection>

      <AnimatedSection delay={0.1}>
        <TrackRecord />
      </AnimatedSection>

      {showBinaPrint ? (
        <AnimatedSection delay={0.1}>
          <ProofOfWork />
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={0.1}>
        <WritingSection />
      </AnimatedSection>
    </>
  );
}
