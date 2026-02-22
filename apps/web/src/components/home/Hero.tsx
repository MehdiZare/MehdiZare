"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StrapiImage } from "@/types/strapi";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { StrapiImage as CMSImage } from "@/components/shared/StrapiImage";

interface HeroProps {
  headline: string;
  subheadline: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  heroImage?: StrapiImage;
}

const floatingDots = [
  { size: 6, x: "8%", y: "18%", duration: 7, delay: 0 },
  { size: 4, x: "86%", y: "14%", duration: 9, delay: 1 },
  { size: 8, x: "70%", y: "76%", duration: 8, delay: 0.5 },
  { size: 5, x: "16%", y: "80%", duration: 10, delay: 2 },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const childVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" as const },
  },
};

export function Hero({
  headline,
  subheadline,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  heroImage,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <motion.div
        className="absolute inset-0 -z-20"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "radial-gradient(circle at 12% 15%, rgba(45,212,191,0.22), transparent 32%), radial-gradient(circle at 84% 22%, rgba(59,130,246,0.2), transparent 30%), linear-gradient(120deg, #020617 0%, #0f172a 40%, #111827 100%)",
          backgroundSize: "220% 220%",
        }}
      />

      {floatingDots.map((dot, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full bg-teal-300/15"
          style={{
            width: dot.size,
            height: dot.size,
            left: dot.x,
            top: dot.y,
          }}
          animate={{ y: [-18, 18, -18], opacity: [0.25, 0.6, 0.25] }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="relative z-10 mx-auto grid min-h-[82vh] max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:px-8">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <motion.span
            variants={childVariants}
            className={cn(
              "inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100"
            )}
          >
            CFA Charterholder x Principal AI Engineer
          </motion.span>

          <motion.h1
            variants={childVariants}
            className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            {headline}
          </motion.h1>

          <motion.p
            variants={childVariants}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200"
          >
            {subheadline}
          </motion.p>

          <motion.div
            variants={childVariants}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link
              href={primaryCtaHref}
              className="rounded-full bg-teal-400 px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-teal-300"
              onClick={() => {
                trackEvent("cta_book_call_clicked", {
                  page: "home",
                  section: "hero",
                  cta_label: primaryCtaLabel,
                });
              }}
            >
              {primaryCtaLabel}
            </Link>
            <Link
              href={secondaryCtaHref}
              className="rounded-full border border-white/35 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => {
                trackEvent("cta_try_bina_clicked", {
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

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.25 }}
          className="relative"
        >
          <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-3xl border border-white/15 bg-slate-900/40 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.7)]">
            {heroImage ? (
              <CMSImage image={heroImage} fill priority className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-teal-300">Mehdi Zare</p>
                  <p className="mt-4 text-xl font-semibold text-white">AI That Thinks Like an Analyst</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
