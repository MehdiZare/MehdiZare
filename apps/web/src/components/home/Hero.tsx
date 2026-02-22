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
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">
      {/* Animated gradient background */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(45,212,191,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(0,0,0,0.8) 0%, transparent 60%)",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto max-w-3xl px-6 text-center"
      >
        <motion.p
          variants={childVariants}
          className="mb-6 font-mono text-[0.65rem] font-medium uppercase tracking-[0.35em] text-teal-300"
        >
          AI Engineer &middot; CFA Charterholder &middot; Builder
        </motion.p>

        <motion.h1
          variants={childVariants}
          className="text-4xl font-bold leading-[0.95] tracking-tight text-white sm:text-5xl lg:text-7xl"
        >
          {headline}
        </motion.h1>

        <motion.p
          variants={childVariants}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg"
        >
          {subheadline}
        </motion.p>

        <motion.div
          variants={childVariants}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            href={primaryCtaHref}
            className="inline-flex items-center gap-3 bg-teal-400 px-7 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_40px_rgba(45,212,191,0.2)]"
            onClick={() => {
              trackEvent("cta_book_call_clicked", {
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
            className="inline-flex items-center gap-2 border border-white/20 px-7 py-3 font-mono text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition-all hover:border-white/40 hover:text-white"
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

      {/* Scroll hint */}
      <div className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.25em] text-white/30">
          Scroll
        </span>
        <motion.div
          className="h-10 w-px bg-gradient-to-b from-white/40 to-transparent"
          animate={{ scaleY: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </div>
    </section>
  );
}
