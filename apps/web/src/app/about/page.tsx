import type { Metadata } from "next";
import Link from "next/link";
import { CareerTimeline } from "@/components/about/CareerTimeline";
import { CredentialBadges } from "@/components/about/CredentialBadges";
import { BlocksRenderer } from "@/components/blog/BlocksRenderer";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";
import { getAboutPage } from "@/lib/strapi";
import type {
  Credential,
  Education,
  Experience,
  SocialLink,
  StatItem,
  BlocksContent,
} from "@/types/strapi";

const fallbackStory = [
  "I started in physics in Tehran, where I learned to think in systems, uncertainty, and first principles. That analytical mindset later carried into finance through an MBA at the University of Maryland Smith School.",
  "At Capital One, I worked across quantitative analysis and investment workflows where decisions had to be both data-driven and execution-ready. That period made one thing clear: AI in finance fails when domain and engineering stay siloed.",
  "I moved deeper into production AI delivery through roles at Booz Allen Hamilton, JotPsych, and Sev1Tech supporting mission-critical systems. Across defense, healthcare, and enterprise programs, I focused on turning prototypes into reliable systems teams could trust.",
  "Today I am building Bina Capital and Bina Print with a simple thesis: financial AI should think like an analyst and ship like mature software.",
];

const fallbackStats: StatItem[] = [
  { id: 1, value: "12+", label: "Years building software and AI systems" },
  { id: 2, value: "10+", label: "AI systems shipped to production" },
  { id: 3, value: "6+", label: "Products built and shipped end-to-end" },
  { id: 4, value: "4", label: "Regulated industries shipped in" },
  { id: 5, value: "CFA", label: "Charterholder" },
  { id: 6, value: "Secret", label: "Active clearance" },
];

const fallbackCredentials: Credential[] = [
  { id: 1, title: "CFA Charterholder", issuer: "CFA Institute" },
  {
    id: 2,
    title: "AWS Certified Solutions Architect - Associate",
    issuer: "Amazon Web Services",
  },
  { id: 3, title: "Secret Security Clearance", issuer: "U.S. Government" },
];

const fallbackExperiences: Experience[] = [
  {
    id: 1,
    title: "AI SME / Principal Cloud Architect",
    company: "Sev1Tech",
    startDate: "2025",
    current: true,
    description: "Leading AI architecture and delivery for high-impact federal programs.",
  },
  {
    id: 2,
    title: "Principal AI Engineer",
    company: "JotPsych",
    startDate: "2025",
    endDate: "2025",
    description: "Built production GenAI workflows in healthcare settings.",
  },
  {
    id: 3,
    title: "Lead Generative AI Engineer",
    company: "Booz Allen Hamilton",
    startDate: "2024",
    endDate: "2025",
    description: "Designed and deployed enterprise-grade GenAI solutions.",
  },
  {
    id: 4,
    title: "Quantitative Analysis Manager / Investment Analyst",
    company: "Capital One",
    startDate: "2020",
    endDate: "2024",
    description: "Applied quant and ML methods to high-stakes financial decisions.",
  },
  {
    id: 5,
    title: "Equity Research Analyst",
    company: "Seeking Alpha",
    startDate: "2017",
    endDate: "2018",
    description: "Published equity research for a large retail investor audience.",
  },
  {
    id: 6,
    title: "Founder & CEO",
    company: "Fardabook.com",
    startDate: "2011",
    endDate: "2014",
    description: "Built and operated a digital product business from the ground up.",
  },
];

const fallbackEducation: Education[] = [
  {
    id: 1,
    degree: "MBA",
    field: "Finance",
    institution: "University of Maryland, Smith School of Business",
  },
  {
    id: 2,
    degree: "B.S.",
    field: "Physics",
    institution: "University of Tehran",
  },
];

const fallbackLinks: SocialLink[] = [
  { id: 1, platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
  { id: 2, platform: "Medium", url: "https://medium.com/@mehdi-zare" },
  { id: 3, platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
  { id: 4, platform: "GitHub", url: "https://github.com/mehdizare" },
];

const aboutMetadataTitle = "About";
const aboutMetadataDescription =
  "The story behind Mehdi Zare - principal AI engineer delivering production AI systems across finance, defense, healthcare, and enterprise.";
const consultingCalendlyHref = "/consulting#calendly";

export async function generateMetadata(): Promise<Metadata> {
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
      title: cmsData?.title || aboutMetadataTitle,
      description: cmsData?.positioningStatement || aboutMetadataDescription,
      seo: cmsData?.seo,
      type: "website",
      keywords: aboutKeywords,
    });
  } catch {
    return buildPageMetadata({
      pathname: "/about",
      title: aboutMetadataTitle,
      description: aboutMetadataDescription,
      type: "website",
      keywords: aboutKeywords,
    });
  }
}

export default async function AboutPage() {
  const fallbackData = {
    title: "The CFA Who Codes",
    positioningStatement:
      "I help high-stakes teams move AI from pilot to production with domain rigor, engineering execution, and business context.",
    story: fallbackStory,
    storyBlocks: undefined as BlocksContent | undefined,
    stats: fallbackStats,
    credentials: fallbackCredentials,
    experiences: fallbackExperiences,
    education: fallbackEducation,
    socialLinks: fallbackLinks,
  };

  let data = fallbackData;
  let cmsStructuredData: unknown;

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
        title: cmsData.title || fallbackData.title,
        positioningStatement:
          cmsData.positioningStatement || fallbackData.positioningStatement,
        story: fallbackData.story,
        storyBlocks: cmsData.bio,
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
    // Use fallback content if CMS is unavailable.
  }

  return (
    <div className="bg-paper pb-20">
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
            <SectionHeading title="The Story" subtitle="From quant foundations to production AI leadership" />
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
                href={consultingCalendlyHref}
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
