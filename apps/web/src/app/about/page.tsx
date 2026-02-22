import type { Metadata } from "next";
import type { Experience, Credential, Education, SocialLink } from "@/types/strapi";
import { CareerTimeline } from "@/components/about/CareerTimeline";
import { CredentialBadges } from "@/components/about/CredentialBadges";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import { SectionHeading } from "@/components/shared/SectionHeading";

// ---------------------------------------------------------------------------
// Static data (Strapi may not be running during build)
// ---------------------------------------------------------------------------

function getAboutData() {
  const title = "About Mehdi";
  const positioningStatement =
    "Dual CFA Charterholder and Principal AI Engineer with a rare combination of deep financial expertise and hands-on machine learning engineering. I help financial institutions harness AI to build smarter products, reduce risk, and create lasting competitive advantages.";

  const bioNarrative = [
    "My journey began with a degree in Physics, where I developed a rigorous analytical foundation and a fascination with modeling complex systems. That curiosity led me to pursue an MBA in Finance, bridging the gap between quantitative methods and business strategy.",
    "At Capital One, I cut my teeth as a Senior AI Engineer building fraud detection and credit risk models that served millions of customers. I then moved to Booz Allen Hamilton as an AI Consultant, designing and deploying AI solutions for federal agencies navigating their digital transformation.",
    "At Sev1Tech, working on contract with CISA (Cybersecurity and Infrastructure Security Agency), I served as a Principal AI Engineer building machine learning pipelines for cybersecurity threat detection at national scale. This role deepened my expertise in production ML systems operating under strict security and compliance requirements.",
    "Today, as Chief Investment Officer at Bina Capital, I lead AI-driven quantitative investment strategies, applying everything I have learned about machine learning, financial markets, and risk management to generate alpha in public markets.",
  ];

  const credentials: Credential[] = [
    {
      id: 1,
      title: "CFA Charterholder",
      issuer: "CFA Institute",
      description: "Chartered Financial Analyst designation",
    },
    {
      id: 2,
      title: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      description: "AWS Certified Solutions Architect",
    },
    {
      id: 3,
      title: "Secret Security Clearance",
      issuer: "U.S. Government",
      description: "Active security clearance",
    },
  ];

  const experiences: Experience[] = [
    {
      id: 1,
      title: "Chief Investment Officer",
      company: "Bina Capital",
      startDate: "2024",
      current: true,
      description:
        "Leading AI-driven quantitative investment strategies, combining machine learning models with financial analysis to identify alpha-generating opportunities in public markets.",
    },
    {
      id: 2,
      title: "Principal AI Engineer",
      company: "Sev1Tech / CISA",
      startDate: "2022",
      endDate: "2024",
      description:
        "Built and deployed ML pipelines for cybersecurity threat detection at national scale. Designed production systems under strict security and compliance requirements for critical infrastructure protection.",
    },
    {
      id: 3,
      title: "AI Consultant",
      company: "Booz Allen Hamilton",
      startDate: "2020",
      endDate: "2022",
      description:
        "Designed and implemented AI solutions for federal clients undergoing digital transformation. Led cross-functional teams to deliver production-ready machine learning systems.",
    },
    {
      id: 4,
      title: "Senior AI Engineer",
      company: "Capital One",
      startDate: "2018",
      endDate: "2020",
      description:
        "Developed fraud detection and credit risk models serving millions of customers. Built scalable ML pipelines for real-time decision-making in financial services.",
    },
  ];

  const education: Education[] = [
    {
      id: 1,
      degree: "MBA",
      field: "Finance",
      institution: "University",
      description: "Concentrated in finance, portfolio management, and quantitative methods.",
    },
    {
      id: 2,
      degree: "BS",
      field: "Physics",
      institution: "University",
      description: "Foundation in mathematical modeling, statistical mechanics, and computational methods.",
    },
  ];

  const socialLinks: SocialLink[] = [
    {
      id: 1,
      platform: "LinkedIn",
      url: "https://linkedin.com/in/mehdizare",
    },
    {
      id: 2,
      platform: "Medium",
      url: "https://medium.com/@mehdi-zare",
    },
    {
      id: 3,
      platform: "GitHub",
      url: "https://github.com/mehdizare",
    },
    {
      id: 4,
      platform: "Seeking Alpha",
      url: "https://seekingalpha.com/author/mehdi-zare",
    },
  ];

  return {
    title,
    positioningStatement,
    bioNarrative,
    credentials,
    experiences,
    education,
    socialLinks,
  };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export function generateMetadata(): Metadata {
  const data = getAboutData();
  return {
    title: `${data.title} | Mehdi Zare`,
    description: data.positioningStatement,
    openGraph: {
      title: `${data.title} | Mehdi Zare`,
      description: data.positioningStatement,
    },
  };
}

// ---------------------------------------------------------------------------
// Social link icon helper
// ---------------------------------------------------------------------------

function SocialIcon({ platform }: { platform: string }) {
  switch (platform.toLowerCase()) {
    case "linkedin":
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "medium":
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
        </svg>
      );
    case "github":
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case "seeking alpha":
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function AboutPage() {
  const data = getAboutData();

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-gray-50 pb-16 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {data.title}
            </h1>
            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-gray-600">
              {data.positioningStatement}
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Bio Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="mx-auto max-w-3xl space-y-6">
              {data.bioNarrative.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-lg leading-relaxed text-gray-700"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Credentials Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              title="Credentials"
              subtitle="Professional certifications and clearances"
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="mt-10">
            <CredentialBadges credentials={data.credentials} />
          </AnimatedSection>
        </div>
      </section>

      {/* Career Timeline Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              title="Career Timeline"
              subtitle="A journey through AI engineering and finance"
            />
          </AnimatedSection>
          <div className="mt-12">
            <CareerTimeline experiences={data.experiences} />
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading
              title="Education"
              subtitle="Academic foundations"
            />
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="mt-10">
            <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
              {data.education.map((edu) => (
                <div
                  key={edu.id}
                  className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-semibold text-gray-900">
                    {edu.degree}
                    {edu.field ? `, ${edu.field}` : ""}
                  </h3>
                  <p className="mt-1 text-sm text-primary">{edu.institution}</p>
                  {edu.description && (
                    <p className="mt-3 text-sm text-gray-600">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Social Links Section */}
      <section className="pb-24 pt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <SectionHeading title="Connect" subtitle="Find me around the web" />
          </AnimatedSection>
          <AnimatedSection delay={0.2} className="mt-10">
            <div className="flex flex-wrap justify-center gap-4">
              {data.socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3 text-gray-700 shadow-sm transition hover:border-primary hover:text-primary"
                >
                  <SocialIcon platform={link.platform} />
                  <span className="font-medium">{link.platform}</span>
                </a>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
