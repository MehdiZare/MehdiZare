"use client";

import Link from "next/link";
import { captureEvent } from "@/lib/analytics";
import { Label } from "@/components/shared/Label";

interface ServiceCard {
  number: string;
  title: string;
  description: string;
  href: string;
}

interface ServicesGridProps {
  positioningHeadline: string;
}

const services: ServiceCard[] = [
  {
    number: "01",
    title: "Agent workflow audit",
    description:
      "About 1 to 2 weeks. I review one workflow and give you a written plan: what to automate, what to keep human, which tools, the review rules, and what can go wrong.",
    href: "/consulting",
  },
  {
    number: "02",
    title: "Build sprint",
    description:
      "2 to 4 weeks. I set up one agent workflow end to end in your stack. Your team owns it, with a short runbook.",
    href: "/consulting",
  },
  {
    number: "03",
    title: "Fractional AI-ops lead or CTO",
    description:
      "A monthly engagement. I run the agent setup, review what the agents ship, pick tools, and keep costs in check. Weekly check-in and async help.",
    href: "/consulting",
  },
];

export function ServicesGrid({ positioningHeadline }: ServicesGridProps) {
  return (
    <section id="services" className="bg-ink py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Label className="text-mid-gray">02. What I do</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-paper sm:text-5xl">
          {positioningHeadline}
        </h2>

        <div className="mt-12 grid gap-px bg-white/10 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.number}
              className="bg-ink p-8 transition-all duration-200 hover:-translate-y-1 hover:border-white/10 sm:p-10"
            >
              <span className="font-mono text-xs text-accent-warm">
                {service.number}
              </span>
              <h3 className="mt-3 font-serif text-xl text-paper">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {service.description}
              </p>
              <Link
                href={service.href}
                className="group/link mt-6 inline-flex items-center gap-1 text-sm text-accent-warm transition-colors hover:text-white hover:underline"
                onClick={() => {
                  captureEvent("funnel_cta_click", {
                    section: "services_grid",
                    cta_label: service.title,
                    destination: service.href,
                    interaction_type: "link_click",
                  });
                }}
              >
                Learn more
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform duration-200 group-hover/link:translate-x-1"
                >
                  &rarr;
                </span>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-white/50">
          <Link
            href="/ai-engineer"
            className="text-accent-warm underline underline-offset-4 transition-colors hover:text-white"
            onClick={() => {
              captureEvent("funnel_cta_click", {
                section: "services_grid",
                cta_label: "AI engineer profile",
                destination: "/ai-engineer",
                interaction_type: "link_click",
              });
            }}
          >
            AI engineer profile
          </Link>
        </p>
      </div>
    </section>
  );
}
