import type { Metadata } from "next";
import Link from "next/link";
import { CareerTimeline } from "@/components/about/CareerTimeline";
import { CredentialBadges } from "@/components/about/CredentialBadges";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { DevCmsBanner } from "@/components/shared/DevCmsBanner";
import { buildAboutFallback } from "@/content/fallbacks";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";
import { getAboutPage } from "@/lib/strapi";

const aboutMetadataTitle = "About";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const aboutKeywords = [
    "principal AI engineer",
    "production AI systems",
    "domain-driven AI",
    "CFA charterholder engineer",
    "AI consulting",
  ];

  try {
    const response = await getAboutPage();
    const cmsData = response.data;

    return buildPageMetadata({
      pathname: "/about",
      title: aboutMetadataTitle,
      description: siteProfile.positioningSubheadline,
      seo: cmsData?.seo,
      type: "website",
      keywords: aboutKeywords,
    });
  } catch {
    return buildPageMetadata({
      pathname: "/about",
      title: aboutMetadataTitle,
      description: siteProfile.positioningSubheadline,
      type: "website",
      keywords: aboutKeywords,
    });
  }
}

export default async function AboutPage() {
  const siteProfile = await getSiteProfile();
  const consultingCallHref = siteProfile.bookCallHref;
  const fallbackData = buildAboutFallback(siteProfile);

  let data = fallbackData;
  let cmsStructuredData: unknown;
  let cmsFailed = false;

  try {
    const response = await getAboutPage();
    const cmsData = response.data;
    cmsStructuredData = cmsData?.seo?.structuredData;

    if (cmsData) {
      const experiences =
        cmsData.experiences && cmsData.experiences.length > 0
          ? cmsData.experiences
          : fallbackData.experiences;

      data = {
        title: fallbackData.title,
        positioningStatement: fallbackData.positioningStatement,
        story: fallbackData.story,
        storyBlocks: fallbackData.storyBlocks,
        stats: cmsData.stats && cmsData.stats.length > 0 ? cmsData.stats : fallbackData.stats,
        credentials:
          cmsData.credentials && cmsData.credentials.length > 0
            ? cmsData.credentials
            : fallbackData.credentials,
        experiences,
        education:
          cmsData.education && cmsData.education.length > 0
            ? cmsData.education
            : fallbackData.education,
        socialLinks:
          cmsData.socialLinks && cmsData.socialLinks.length > 0
            ? cmsData.socialLinks
            : fallbackData.socialLinks,
      };
    }
  } catch {
    cmsFailed = true;
  }

  return (
    <div className="bg-paper pb-20">
      {cmsFailed && <DevCmsBanner page="about-page" />}
      <CmsStructuredData
        idPrefix="about-cms-jsonld"
        data={cmsStructuredData}
      />
      <JsonLd
        id="about-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/about",
          title: data.title,
          description: data.positioningStatement,
          type: "AboutPage",
        })}
      />
      <JsonLd
        id="about-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <section className="pb-14 pt-10">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">About</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">{data.title}</h1>
            <p className="mt-5 max-w-3xl text-xl leading-relaxed text-mid-gray">
              {data.positioningStatement}
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <SectionHeading
              title="The Story"
              subtitle={siteProfile.positioningHeadline}
            />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            {data.storyBlocks && data.storyBlocks.length > 0 ? (
              <div className="mx-auto max-w-3xl border border-warm-gray bg-paper p-7">
                <BlocksRenderer content={data.storyBlocks} />
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-5">
                {data.story.map((paragraph) => (
                  <p key={paragraph} className="text-lg leading-relaxed text-mid-gray">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <SectionHeading title="By the Numbers" subtitle="Proof points that support the positioning" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.stats.map((stat) => (
                <article key={stat.id} className="border border-warm-gray bg-paper p-5">
                  <p className="font-serif text-2xl text-ink">{stat.value}</p>
                  <p className="mt-2 text-sm text-mid-gray">{stat.label}</p>
                </article>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <SectionHeading title="Experience Timeline" subtitle="Roles where strategy met delivery" />
          </AnimatedSection>
          <div className="mt-10">
            <CareerTimeline experiences={data.experiences} />
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <SectionHeading title="Certifications & Education" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <CredentialBadges credentials={data.credentials} />
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="mt-10">
            <div className="grid gap-4 sm:grid-cols-2">
              {data.education.map((edu) => (
                <article key={edu.id} className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-medium text-ink">
                    {edu.degree}
                    {edu.field ? `, ${edu.field}` : ""}
                  </h3>
                  <p className="mt-1 text-sm text-accent-warm">{edu.institution}</p>
                  {edu.description ? (
                    <p className="mt-3 text-sm text-mid-gray">{edu.description}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="pb-8 pt-14">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection>
            <SectionHeading title="Portfolio & External Profiles" />
          </AnimatedSection>
          <AnimatedSection delay={0.15} className="mt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {data.socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-warm-gray bg-paper p-5 text-sm font-medium text-mid-gray transition hover:border-ink hover:text-ink"
                >
                  {link.platform}
                </a>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href={consultingCallHref}
                className="inline-flex bg-ink px-7 py-3 text-sm font-medium text-paper transition hover:bg-ink/85"
              >
                Book a Discovery Call
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
