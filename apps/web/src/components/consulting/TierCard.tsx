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
        "relative border p-8 transition-shadow",
        highlighted
          ? "border-ink shadow-lg ring-1 ring-ink/10"
          : "border-warm-gray hover:shadow-md"
      )}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-ink px-4 py-1 text-xs font-medium text-paper">
            Most Popular
          </span>
        </div>
      )}

      <div className="bg-paper">
        <h3 className="font-serif text-xl text-ink">{tier.name}</h3>
        <p className="mt-4 font-serif text-3xl text-ink">{tier.priceRange}</p>
        <p className="mt-1 text-sm text-mid-gray">{tier.hoursPerMonth}</p>
        <p className="mt-4 text-mid-gray">{tier.scope}</p>

        <div className="my-6 h-px bg-warm-gray" />

        <ul className="space-y-3">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="mt-0.5 text-accent-warm">&#10003;</span>
              <span className="text-sm text-mid-gray">{feature}</span>
            </li>
          ))}
        </ul>

        <a
          href="#calendly"
          onClick={() => {
            trackEvent("scheduler_opened", {
              page: "consulting",
              section: "service_tiers",
              tier: tier.name,
            });
          }}
          className={cn(
            "mt-8 block w-full px-6 py-3 text-center font-medium transition",
            highlighted
              ? "bg-ink text-paper hover:bg-ink/85"
              : "border border-ink text-ink hover:bg-ink hover:text-paper"
          )}
        >
          {tier.ctaText}
        </a>
      </div>
    </motion.div>
  );
}
