"use client";

import { motion } from "framer-motion";

const stats = [
  { label: "AI systems in prod", value: "10+" },
  { label: "Years of experience", value: "12+" },
  { label: "Industries shipped in", value: "4" },
  { label: "Products shipped", value: "6+" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.8,
    },
  },
};

const lineVariants = {
  hidden: { x: -8 },
  visible: {
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function HeroStats() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="rounded-lg border border-warm-gray bg-paper p-5"
    >
      {/* Terminal chrome */}
      <div className="flex items-center gap-3 border-b border-warm-gray pb-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>
        <span className="font-mono text-[0.6rem] text-mid-gray/60">
          mehdi --stats
        </span>
      </div>

      {/* Stats lines */}
      <div className="mt-4 space-y-3">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={lineVariants}
            className="flex items-baseline justify-between gap-4"
          >
            <span className="font-mono text-xs text-mid-gray">
              <span className="text-accent-warm">$</span> {stat.label}
            </span>
            <span className="font-mono text-sm font-medium text-ink">
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
