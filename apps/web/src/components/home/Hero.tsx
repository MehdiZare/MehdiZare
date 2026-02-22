"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";
import { Label } from "@/components/shared/Label";
import { HeroStats } from "@/components/home/HeroStats";

interface HeroProps {
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
};

export function Hero({
  headline,
  subheadline,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
}: HeroProps) {
  const emphasisPhrase = "because I learn your domain before I write a line of code.";
  const hasEmphasisPhrase = subheadline.includes(emphasisPhrase);
  const leadSubheadline = hasEmphasisPhrase
    ? subheadline
        .replace(` — ${emphasisPhrase}`, "")
        .replace(` - ${emphasisPhrase}`, "")
        .replace(emphasisPhrase, "")
        .trim()
    : subheadline;

  return (
    <section id="hero" className="-mt-20 flex min-h-screen items-center bg-paper pt-20">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-7"
        >
          <motion.div variants={childVariants}>
            <Label>Principal AI Engineer &middot; CFA Charterholder</Label>
          </motion.div>

          <motion.h1
            variants={childVariants}
            className="mt-6 font-serif text-4xl font-bold leading-[1.1] text-ink sm:text-5xl lg:text-7xl"
          >
            {headline.includes("to production.") ? (
              <>
                {headline.split("to production.")[0]}
                <br className="hidden lg:block" />
                <em className="italic">to production.</em>
              </>
            ) : (
              headline
            )}
          </motion.h1>

          <motion.p
            variants={childVariants}
            className="mt-6 max-w-xl text-base leading-relaxed text-mid-gray sm:text-lg"
          >
            {leadSubheadline}
            {hasEmphasisPhrase && (
              <span className="mt-4 block text-ink">{emphasisPhrase}</span>
            )}
          </motion.p>

          <motion.div
            variants={childVariants}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-3 rounded-sm bg-ink px-7 py-3 text-sm font-medium text-paper transition-all hover:-translate-y-0.5 hover:bg-ink/85 hover:shadow-lg"
              onClick={() => {
                trackEvent("cta_primary_clicked", {
                  page: "home",
                  section: "hero",
                  cta_label: primaryCtaLabel,
                });
              }}
            >
              {primaryCtaLabel}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-3.5 w-3.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href={secondaryCtaHref}
              className="rounded-sm border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
              onClick={() => {
                trackEvent("cta_secondary_clicked", {
                  page: "home",
                  section: "hero",
                  cta_label: secondaryCtaLabel,
                });
              }}
            >
              {secondaryCtaLabel}
            </Link>
          </motion.div>
        </motion.div>

        {/* Terminal-style stats block */}
        <div className="hidden lg:col-span-5 lg:block">
          <HeroStats />
        </div>
      </div>
    </section>
  );
}
