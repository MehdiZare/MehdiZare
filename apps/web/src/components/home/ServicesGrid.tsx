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
    title: "Production AI Engineering",
    description:
      "LLM systems, RAG pipelines, AI agents — built for reliability, not demos. FastAPI, LangGraph, Databricks, AWS. Deployed, monitored, and governed.",
    href: "/consulting",
  },
  {
    letter: "B",
    title: "AI Strategy & Architecture",
    description:
      "Use-case prioritization, vendor evaluation, and technical roadmaps that account for your domain's actual constraints — not generic playbooks.",
    href: "/consulting",
  },
  {
    letter: "C",
    title: "Fractional AI Leadership",
    description:
      "Embedded principal-level technical direction for startups and teams that need senior AI engineering without a full-time executive hire. 3–12 months.",
    href: "/consulting",
  },
  {
    letter: "D",
    title: "GenAI Products & Prototyping",
    description:
      "Rapid build of generative AI products — from chatbots and copilots to document intelligence and automated workflows. Prototype to v1 in weeks.",
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

        <h2 className="mt-6 font-serif text-3xl leading-tight text-paper sm:text-4xl">
          From prototype to production. End to end.
        </h2>

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
