"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

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
  return (
    <section className="-mt-20 flex min-h-screen items-center bg-paper">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center px-6 lg:grid-cols-12 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-8"
        >
          <motion.p
            variants={childVariants}
            className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray"
          >
            CFA Charterholder &middot; Principal AI Engineer
          </motion.p>

          <motion.h1
            variants={childVariants}
            className="mt-6 font-serif text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-7xl"
          >
            {headline.includes("ship AI") ? (
              <>
                {headline.split("ship AI")[0]}
                <em className="italic">ship AI{headline.split("ship AI")[1]}</em>
              </>
            ) : (
              headline
            )}
          </motion.h1>

          <motion.p
            variants={childVariants}
            className="mt-6 max-w-xl text-base leading-relaxed text-mid-gray sm:text-lg"
          >
            {subheadline}
          </motion.p>

          <motion.div
            variants={childVariants}
            className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
          >
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center gap-3 bg-ink px-7 py-3 text-sm font-medium text-paper transition-all hover:bg-ink/85"
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
              className="text-sm text-mid-gray underline underline-offset-4 transition-colors hover:text-ink"
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

        {/* Decorative scroll indicator */}
        <div className="hidden lg:col-span-4 lg:flex lg:items-end lg:justify-end">
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.25em] text-mid-gray/50">
              Scroll
            </span>
            <motion.div
              className="h-16 w-px bg-gradient-to-b from-mid-gray/40 to-transparent"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "top" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
