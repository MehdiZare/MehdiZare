import type { Metadata } from "next";
import { Outfit, Playfair_Display, JetBrains_Mono } from "next/font/google";
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

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} | Principal AI Engineer`,
    template: "%s | Mehdi Zare",
  },
  description: DEFAULT_SITE_DESCRIPTION,
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
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Principal AI Engineer`,
    description:
      "Principal AI Engineer shipping production AI systems across finance, defense, healthcare, and enterprise. CFA Charterholder.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${playfair.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <JsonLd id="website-jsonld" data={buildWebsiteJsonLd()} />
        <JsonLd id="person-jsonld" data={buildPersonJsonLd()} />
        <PostHogScripts />
        <Navbar />
        <main className="min-h-screen pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
