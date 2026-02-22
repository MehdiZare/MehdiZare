"use client";

import { motion } from "framer-motion";

interface CredentialItem {
  label: string;
  value: string;
  dot?: string;
}

const credentials: CredentialItem[] = [
  { label: "Role", value: "Principal AI Engineer" },
  { label: "Domains", value: "Finance · Defense · Health" },
  { label: "Credential", value: "CFA Charterholder", dot: "bg-accent-warm" },
  { label: "Clearance", value: "Active Secret", dot: "bg-green-500" },
  { label: "Cloud", value: "AWS Solutions Architect" },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function CredentialsStrip() {
  return (
    <section id="credentials" className="border-y border-warm-gray">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-warm-gray sm:grid-cols-3 lg:grid-cols-5"
      >
        {credentials.map((item) => (
          <motion.div
            key={item.label}
            variants={itemVariants}
            className="px-6 py-6 text-left"
          >
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-mid-gray">
              {item.label}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-ink">
              {item.dot && (
                <span className={`inline-block h-2 w-2 rounded-full ${item.dot}`} />
              )}
              {item.value}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
