"use client";

import { motion } from "framer-motion";

interface CredentialItem {
  label: string;
  value: string;
  dot?: string;
}

interface CredentialsStripProps {
  credentialLine: string;
}

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
  hidden: { y: 8 },
  visible: {
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export function CredentialsStrip({ credentialLine }: CredentialsStripProps) {
  const credentials: CredentialItem[] = [
    { label: "Title", value: credentialLine },
    { label: "Cloud", value: "AWS Solutions Architect" },
    { label: "Service area", value: "Remote, anywhere" },
  ];

  return (
    <section id="credentials" className="border-y border-warm-gray">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-warm-gray sm:grid-cols-3 sm:divide-x sm:divide-y-0"
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
