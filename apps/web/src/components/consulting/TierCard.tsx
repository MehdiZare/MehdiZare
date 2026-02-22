"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface Tier {
  name: string;
  priceRange: string;
  hoursPerMonth: string;
  scope: string;
  features: string[];
  ctaText: string;
}

interface TierCardProps {
  tier: Tier;
  highlighted?: boolean;
}

export function TierCard({ tier, highlighted = false }: TierCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "relative rounded-2xl border p-8 transition-shadow",
        highlighted
          ? "border-primary shadow-lg ring-1 ring-primary/10"
          : "border-gray-200 shadow-sm hover:shadow-md"
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-white">
            Most Popular
          </span>
        </div>
      )}

      <div className="bg-white">
        <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
        <p className="mt-4 text-3xl font-bold text-primary">{tier.priceRange}</p>
        <p className="mt-1 text-sm text-gray-500">{tier.hoursPerMonth}</p>
        <p className="mt-4 text-gray-600">{tier.scope}</p>

        <div className="my-6 h-px bg-gray-200" />

        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-0.5 font-bold text-primary">&#10003;</span>
              <span className="text-sm text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>

        <a
          href="#calendly"
          onClick={() => {
            trackEvent("calendly_opened", {
              page: "consulting",
              section: "service_tiers",
              tier: tier.name,
            });
          }}
          className={cn(
            "mt-8 block w-full rounded-lg px-6 py-3 text-center font-medium transition",
            highlighted
              ? "bg-primary text-white hover:bg-teal-800"
              : "border border-primary text-primary hover:bg-teal-50"
          )}
        >
          {tier.ctaText}
        </a>
      </div>
    </motion.div>
  );
}
