import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PostHogScripts } from "@/components/analytics/PostHogScripts";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mehdi-zare.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mehdi Zare | CFA Charterholder x Principal AI Engineer",
    template: "%s | Mehdi Zare",
  },
  description:
    "AI consulting and thought leadership at the intersection of finance and engineering. From pilot to production for financial AI systems.",
  openGraph: {
    title: "Mehdi Zare | AI That Thinks Like an Analyst",
    description:
      "The bridge between Wall Street and Silicon Valley. CFA-level financial rigor with principal-level AI execution.",
    siteName: "Mehdi Zare",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <PostHogScripts />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
