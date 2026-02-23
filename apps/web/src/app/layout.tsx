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
            })}
          />
          <JsonLd
            id="person-jsonld"
            data={buildPersonJsonLd({
              name: siteProfile.siteName,
              title: siteProfile.authorRole,
              description: siteProfile.siteDescription,
              sameAs: siteProfile.socialLinks.map((socialLink) => socialLink.url),
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
