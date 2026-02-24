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
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildHomeFallback, splitIndustries } from "@/content/fallbacks";
import { isBinaPrintEnabled } from "@/lib/feature-flags";
import { getSiteProfile } from "@/lib/site-profile";
import { getHomePage } from "@/lib/strapi";
import { buildPageMetadata, buildWebPageJsonLd } from "@/lib/seo";
import { DevCmsBanner } from "@/components/shared/DevCmsBanner";
import type { SEO } from "@/types/strapi";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const homeMetadataTitle = `${siteProfile.authorRole} · CFA Charterholder`;

  try {
    const response = await getHomePage();
    const data = response.data;

    return buildPageMetadata({
      pathname: "/",
      title: homeMetadataTitle,
      description: siteProfile.siteDescription,
      seo: data?.seo,
      image: data?.heroImage,
      type: "website",
    });
  } catch {
    return buildPageMetadata({
      pathname: "/",
      title: homeMetadataTitle,
      description: siteProfile.siteDescription,
      type: "website",
    });
  }
}

export default async function Home() {
  const showBinaPrint = isBinaPrintEnabled();
  const siteProfile = await getSiteProfile();
  const fallbackHome = buildHomeFallback(siteProfile);
  let homeData = fallbackHome;
  let pageSeo: SEO | undefined;
  let cmsFailed = false;

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
      };
    }
  } catch {
    cmsFailed = true;
  }

  return (
    <>
      {cmsFailed && <DevCmsBanner page="home-page" />}
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
