"use client";

import { motion } from "framer-motion";

interface ClientLogosProps {
  items: string[];
  introText?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function ClientLogos({ items, introText = "Trusted by teams in" }: ClientLogosProps) {
  return (
    <section className="border-b border-warm-gray bg-paper py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 px-6 lg:px-8"
      >
        <motion.span
          variants={itemVariants}
          className="text-sm text-mid-gray"
        >
          {introText}
        </motion.span>
        {items.map((name, i) => (
          <motion.span key={name} variants={itemVariants} className="text-sm font-medium text-ink">
            {name}
            {i < items.length - 1 && (
              <span className="ml-2 text-mid-gray/40">&middot;</span>
            )}
          </motion.span>
        ))}
      </motion.div>
    </section>
  );
}
