"use client";

import { motion } from "framer-motion";
import { blankToUndefined } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Experience } from "@/types/strapi";

interface CareerTimelineProps {
  experiences: Experience[];
}

// Reveal by translation only. A zero-opacity initial state gets inlined into
// the SSR markup, so timeline cards would stay invisible whenever JS is delayed
// or hydration fails. `MotionProvider` wraps the tree in
// `MotionConfig reducedMotion="user"`, which turns the transform into an
// instant jump for reduced-motion clients, so `initial` stays the same on every
// client and hydration never mismatches.
const cardVariants = {
  hidden: { y: 24 },
  visible: (delay: number) => ({
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const, delay },
  }),
};

export function CareerTimeline({ experiences }: CareerTimelineProps) {
  return (
    <div className="relative">
      {/* Center line - desktop: center, mobile: left */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-warm-gray md:left-1/2 md:-translate-x-px" />

      <div className="space-y-12">
        {experiences.map((experience, index) => {
          const isEven = index % 2 === 0;
          // A cleared CMS field arrives as `""` and a field left with a space
          // as `"   "`. The latter is truthy, so guarding on the raw value
          // renders an empty paragraph and a stray gap (#89).
          const description = blankToUndefined(experience.description);

          return (
            <motion.div
              key={experience.id}
              variants={cardVariants}
              custom={index * 0.15}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              className={cn(
                "relative flex items-start",
                "pl-12 md:pl-0",
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              )}
            >
              {/* Dot on the timeline */}
              <div
                className={cn(
                  "absolute left-[10px] top-6 z-10 h-3 w-3 rounded-full bg-ink",
                  "md:left-1/2 md:-translate-x-1.5"
                )}
              />

              {/* Spacer for the other side on desktop */}
              <div className="hidden md:block md:w-1/2" />

              {/* Card */}
              <div
                className={cn(
                  "w-full md:w-1/2",
                  isEven ? "md:pr-12" : "md:pl-12"
                )}
              >
                <div className="border border-warm-gray bg-paper p-6">
                  <h3 className="font-medium text-ink">
                    {experience.title}
                  </h3>
                  <p className="font-mono text-sm text-accent-warm">{experience.company}</p>
                  <p className="mt-1 font-mono text-xs text-mid-gray">
                    {formatPeriod(experience.startDate, experience.endDate, experience.current)}
                  </p>
                  {description && (
                    <p className="mt-3 text-sm text-mid-gray">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function formatPeriod(
  startDate: string,
  endDate?: string,
  current?: boolean
): string {
  const start = formatDate(startDate);
  if (current) return `${start} \u2013 Present`;
  if (!endDate) return start;
  return `${start} \u2013 ${formatDate(endDate)}`;
}

function formatDate(dateStr: string): string {
  // Handle both "2024" and "2024-01-01" formats
  if (dateStr.length === 4) return dateStr;
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}
