"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Experience } from "@/types/strapi";

interface CareerTimelineProps {
  experiences: Experience[];
}

export function CareerTimeline({ experiences }: CareerTimelineProps) {
  return (
    <div className="relative">
      {/* Center line - desktop: center, mobile: left */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200 md:left-1/2 md:-translate-x-px" />

      <div className="space-y-12">
        {experiences.map((experience, index) => {
          const isEven = index % 2 === 0;

          return (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                ease: "easeOut",
                delay: index * 0.15,
              }}
              className={cn(
                "relative flex items-start",
                "pl-12 md:pl-0",
                // Desktop: alternate sides
                isEven ? "md:flex-row" : "md:flex-row-reverse"
              )}
            >
              {/* Dot on the timeline */}
              <div
                className={cn(
                  "absolute left-[10px] top-6 z-10 h-3 w-3 rounded-full bg-primary",
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
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900">
                    {experience.title}
                  </h3>
                  <p className="font-medium text-primary">{experience.company}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatPeriod(experience.startDate, experience.endDate, experience.current)}
                  </p>
                  {experience.description && (
                    <p className="mt-3 text-sm text-gray-600">
                      {experience.description}
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
