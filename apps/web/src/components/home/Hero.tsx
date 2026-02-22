"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const floatingDots = [
  { size: 6, x: "10%", y: "20%", duration: 7, delay: 0 },
  { size: 4, x: "85%", y: "15%", duration: 9, delay: 1 },
  { size: 8, x: "70%", y: "70%", duration: 8, delay: 0.5 },
  { size: 5, x: "20%", y: "75%", duration: 10, delay: 2 },
  { size: 7, x: "50%", y: "30%", duration: 6, delay: 1.5 },
  { size: 3, x: "90%", y: "50%", duration: 11, delay: 0.8 },
];

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
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          background:
            "linear-gradient(135deg, rgba(204,251,241,0.3) 0%, #ffffff 40%, #F9FAFB 100%)",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Floating dots */}
      {floatingDots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-primary/10"
          style={{
            width: dot.size,
            height: dot.size,
            left: dot.x,
            top: dot.y,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            delay: dot.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto max-w-7xl px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={childVariants}>
          <span
            className={cn(
              "inline-block rounded-full border border-gray-200 bg-white/80 px-5 py-2",
              "text-sm font-medium text-gray-700 backdrop-blur-sm"
            )}
          >
            CFA Charterholder | Principal AI Engineer
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          variants={childVariants}
        >
          <span className="text-gray-900">Bridging</span>
          <br />
          <span className="text-primary">AI &amp; Finance</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 leading-relaxed"
          variants={childVariants}
        >
          Financial institutions waste millions on AI projects that fail because
          their engineers don&apos;t understand finance and their finance teams
          don&apos;t understand AI. I eliminate that gap.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          variants={childVariants}
        >
          <Link
            href="/consulting"
            className={cn(
              "rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white",
              "transition-colors hover:bg-primary-dark"
            )}
          >
            Book a Consultation
          </Link>
          <Link
            href="/blog"
            className={cn(
              "rounded-full border border-gray-300 px-8 py-3 text-sm font-semibold text-gray-700",
              "transition-colors hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            Read the Blog
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
