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
    title: "Production AI Engineering",
    description:
      "Your AI system needs to work on Monday morning, not just in a Thursday demo. I build LLM-powered products—agents, search, and document intelligence—that run in production with monitoring and governance.",
    href: "/ai-engineer",
  },
  {
    number: "02",
    title: "AI Strategy & Architecture",
    description:
      "Before writing code, I help you choose the highest-leverage use cases, evaluate vendors against real constraints, and define a roadmap your team can actually execute.",
    href: "/consulting",
  },
  {
    number: "03",
    title: "Fractional AI Leadership",
    description:
      "Senior technical direction for teams that need experienced AI engineering leadership without a full-time executive hire. Embedded support over focused 3–12 month engagements.",
    href: "/consulting",
  },
  {
    number: "04",
    title: "GenAI Products & Prototyping",
    description:
      "When speed matters, I take ideas from concept to usable v1 quickly—then design the path from prototype to dependable production.",
    href: "/consulting",
  },
];

export function ServicesGrid({ positioningHeadline }: ServicesGridProps) {
  return (
    <section id="services" className="bg-ink py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Label className="text-mid-gray">02 &mdash; What I Do</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-paper sm:text-5xl">
          {positioningHeadline} End to end.
        </h2>

        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2">
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
      </div>
    </section>
  );
}
