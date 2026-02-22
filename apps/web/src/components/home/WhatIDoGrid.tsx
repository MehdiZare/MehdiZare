"use client";

import Link from "next/link";
import type { HomeValueCard } from "@/types/strapi";
import { trackEvent } from "@/lib/analytics";

interface WhatIDoGridProps {
  cards: HomeValueCard[];
}

export function WhatIDoGrid({ cards }: WhatIDoGridProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            What I Do
          </h2>
          <p className="mt-3 text-slate-600">
            Three ways to work with me at the AI and finance intersection.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
            >
              <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
              {card.description ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.description}</p>
              ) : null}
              {card.ctaHref && card.ctaLabel ? (
                <Link
                  href={card.ctaHref}
                  className="mt-6 inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-600"
                  onClick={() => {
                    trackEvent("home_what_i_do_cta_clicked", {
                      page: "home",
                      section: "what_i_do",
                      cta_label: card.ctaLabel,
                    });
                  }}
                >
                  {card.ctaLabel}
                  <span className="ml-1" aria-hidden="true">
                    &rarr;
                  </span>
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
