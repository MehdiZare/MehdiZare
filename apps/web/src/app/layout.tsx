import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostHogScripts } from "@/components/analytics/PostHogScripts";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildPersonJsonLd,
  buildWebsiteJsonLd,
  DEFAULT_SITE_DESCRIPTION,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/seo";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | Principal AI Engineer`,
    template: "%s | Mehdi Zare",
  },
  description: DEFAULT_SITE_DESCRIPTION,
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
  authors: [{ name: SITE_NAME, url: siteUrl }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    title: `${SITE_NAME} | Principal AI Engineer`,
    description:
      "Principal AI Engineer shipping production AI systems across finance, defense, healthcare, and enterprise. CFA Charterholder.",
    url: siteUrl,
    siteName: SITE_NAME,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Mehdi Zare - Principal AI Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Principal AI Engineer`,
    description:
      "Principal AI Engineer shipping production AI systems across finance, defense, healthcare, and enterprise. CFA Charterholder.",
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <a
          href={"#main-content"}
          className="sr-only z-[100] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <JsonLd id="website-jsonld" data={buildWebsiteJsonLd()} />
        <JsonLd id="person-jsonld" data={buildPersonJsonLd()} />
        <PostHogScripts />
        <Navbar />
        <main id="main-content" className="min-h-screen pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
