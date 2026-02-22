"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface ServiceCard {
  letter: string;
  title: string;
  description: string;
  href: string;
}

const services: ServiceCard[] = [
  {
    letter: "A",
    title: "AI Strategy",
    description:
      "Roadmap from pilot to production. Identify the right use cases, set realistic timelines, and align stakeholders before writing a single line of code.",
    href: "/consulting",
  },
  {
    letter: "B",
    title: "Production AI Engineering",
    description:
      "End-to-end build-out of AI systems that meet financial-grade reliability, compliance, and performance requirements.",
    href: "/consulting",
  },
  {
    letter: "C",
    title: "Fractional AI Leadership",
    description:
      "Embedded technical leadership for teams that need a principal-level engineer without the full-time overhead.",
    href: "/consulting",
  },
  {
    letter: "D",
    title: "AI + Compliance",
    description:
      "Model governance, explainability frameworks, and regulatory alignment for AI in regulated industries.",
    href: "/consulting",
  },
];

export function ServicesGrid() {
  return (
    <section className="bg-ink py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          02 &mdash; What I Do
        </p>

        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2">
          {services.map((service) => (
            <div key={service.letter} className="bg-ink p-8 sm:p-10">
              <span className="font-mono text-xs text-accent-warm">
                {service.letter}
              </span>
              <h3 className="mt-3 font-serif text-2xl text-paper">
                {service.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/50">
                {service.description}
              </p>
              <Link
                href={service.href}
                className="mt-6 inline-flex items-center gap-1 text-sm text-accent-warm transition-colors hover:text-white"
                onClick={() => {
                  trackEvent("home_service_cta_clicked", {
                    page: "home",
                    section: "services",
                    cta_label: service.title,
                  });
                }}
              >
                Learn more
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
