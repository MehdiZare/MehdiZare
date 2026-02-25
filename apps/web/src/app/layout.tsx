import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostHogScripts } from "@/components/analytics/PostHogScripts";
import { JsonLd } from "@/components/seo/JsonLd";
import { MotionProvider } from "@/components/shared/MotionProvider";
import {
  buildPersonJsonLd,
  buildWebsiteJsonLd,
  getSiteUrl,
  toAbsoluteMediaUrl,
  toPersonId,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";
import "./globals.css";

const siteUrl = getSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const titleDefault = `${siteProfile.siteName} | ${siteProfile.authorRole}`;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: titleDefault,
      template: `%s | ${siteProfile.siteName}`,
    },
    description: siteProfile.siteDescription,
    keywords: [
      "AI engineering",
      "production AI systems",
      "LLM systems",
      "AI consulting",
      "domain-driven AI",
    ],
    alternates: {
      canonical: "/",
    },
    robots: {
      index: true,
      follow: true,
    },
    authors: [{ name: siteProfile.siteName, url: siteUrl }],
    creator: siteProfile.siteName,
    publisher: siteProfile.siteName,
    openGraph: {
      title: titleDefault,
      description: siteProfile.siteDescription,
      url: siteUrl,
      siteName: siteProfile.siteName,
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${siteProfile.siteName} - ${siteProfile.authorRole}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description: siteProfile.siteDescription,
      images: ["/twitter-image"],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteProfile = await getSiteProfile();
  const personPath = siteProfile.author.profilePath;
  const personId = toPersonId(personPath);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href={"#main-content"}
          className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <MotionProvider>
          <JsonLd
            id="website-jsonld"
            data={buildWebsiteJsonLd({
              name: siteProfile.siteName,
              description: siteProfile.siteDescription,
              publisherId: personId,
            })}
          />
          <JsonLd
            id="person-jsonld"
            data={buildPersonJsonLd({
              id: personId,
              path: personPath,
              name: siteProfile.authorName,
              title: siteProfile.authorRole,
              description: siteProfile.siteDescription,
              url: siteProfile.author.websiteUrl,
              imageUrl: toAbsoluteMediaUrl(siteProfile.author.profileImage?.url),
              worksForName: siteProfile.author.worksForName,
              worksForUrl: siteProfile.author.worksForUrl,
              alumniOf: siteProfile.author.alumniOf,
              credentials: siteProfile.author.credentials.map((credential) => ({
                name: credential.title,
                issuer: credential.issuer,
                url: credential.url,
                description: credential.description,
              })),
              addressLocality: siteProfile.author.addressLocality,
              addressRegion: siteProfile.author.addressRegion,
              addressCountry: siteProfile.author.addressCountry,
              mainEntityOfPagePath: personPath,
              sameAs: siteProfile.author.sameAs.map((socialLink) => socialLink.url),
              knowsAbout: siteProfile.knowsAbout,
            })}
          />
          <PostHogScripts />
          <Navbar
            siteName={siteProfile.siteName}
            navLinks={siteProfile.navItems}
            ctaLabel={siteProfile.primaryCtaLabel}
            ctaHref={siteProfile.primaryCtaHref}
          />
          <main id="main-content" className="min-h-screen pt-20">
            {children}
          </main>
          <Footer
            siteName={siteProfile.siteName}
            credentialLine={siteProfile.credentialLine}
            locationLine={siteProfile.locationLine}
            socialLinks={siteProfile.socialLinks}
            footerText={siteProfile.footerText}
          />
        </MotionProvider>
      </body>
    </html>
  );
}
