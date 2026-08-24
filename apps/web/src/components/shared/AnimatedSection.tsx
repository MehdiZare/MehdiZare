"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: boolean;
}

const sectionVariants = {
  hidden: { y: 24 },
  visible: (delay: number) => ({
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const, delay },
  }),
};

const staggerContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerChildVariants = {
  hidden: { y: 16 },
  visible: {
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function AnimatedSection({
  children,
  className,
  delay = 0,
  stagger = false,
}: AnimatedSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion ? false : "hidden";

  if (stagger) {
    return (
      <motion.div
        variants={staggerContainerVariants}
        initial={initial}
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={sectionVariants}
      custom={delay}
      initial={initial}
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
