import type { Metadata } from "next";
import { CalComTrigger } from "@/components/scheduling/CalComTrigger";
import { JsonLd } from "@/components/seo/JsonLd";
import { AnimatedSection } from "@/components/shared/AnimatedSection";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
  getSiteUrl,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();

  return buildPageMetadata({
    pathname: "/contact",
    title: "Contact",
    description: siteProfile.contactPrompt,
    type: "website",
    keywords: [
      "AI consulting contact",
      "production AI engineer",
      "AI strategy call",
      "LLM systems consulting",
    ],
  });
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

export default async function ContactPage() {
  const siteProfile = await getSiteProfile();
  const siteUrl = getSiteUrl();
  const serviceAreaName = [
    siteProfile.author.addressLocality,
    siteProfile.author.addressRegion,
    siteProfile.author.addressCountry,
  ]
    .filter(Boolean)
    .join(", ");
  const areaServed = serviceAreaName
    ? [{ "@type": "Place", name: serviceAreaName }, { "@type": "Country", name: "United States" }]
    : [{ "@type": "Country", name: "United States" }];
  const contactPointJsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPoint",
    "@id": `${siteUrl}/contact#contactpoint`,
    url: `${siteUrl}/contact`,
    contactType: "AI consulting inquiries",
    availableLanguage: ["English"],
    areaServed,
    description: siteProfile.contactPrompt,
    about: {
      "@id": `${siteUrl}/#person`,
    },
    mainEntityOfPage: {
      "@id": `${siteUrl}/contact#webpage`,
    },
  };

  return (
    <div className="bg-paper">
      <JsonLd
        id="contact-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/contact",
          title: "Get in Touch",
          description: siteProfile.contactPrompt,
          type: "ContactPage",
        })}
      />
      <JsonLd
        id="contact-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <JsonLd id="contact-point-jsonld" data={contactPointJsonLd} />
      {/* Header Section */}
      <section className="pb-16 pt-10">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <AnimatedSection>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">Contact</p>
            <h1 className="mt-4 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-4 text-xl text-mid-gray">{siteProfile.contactPrompt}</p>
          </AnimatedSection>
        </div>
      </section>

      {/* Social Links + Schedule Section */}
      <section className="pb-24 pt-4">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <AnimatedSection>
            <div className="border border-warm-gray bg-paper p-8">
              <h2 className="font-serif text-2xl text-ink">
                Let&apos;s Connect
              </h2>

              {/* Social Links */}
              <div className="mt-8">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">
                  Social
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {siteProfile.socialLinks.map((link) => (
                    <a
                      key={`${link.id}-${link.url}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-mid-gray transition hover:text-ink"
                    >
                      <SocialIcon platform={link.platform} />
                      <span className="font-medium">{link.platform}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-10 border border-warm-gray bg-muted p-5">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">
                  Schedule
                </h3>
                <p className="mt-2 text-sm text-mid-gray">
                  Prefer to talk live? Book a 20-minute call.
                </p>
                <CalComTrigger
                  className="mt-4"
                  section="schedule_panel"
                />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
