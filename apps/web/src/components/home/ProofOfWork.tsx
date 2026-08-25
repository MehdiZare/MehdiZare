"use client";

import type { CSSProperties } from "react";
import { Label } from "@/components/shared/Label";
import { CountUp } from "@/components/shared/CountUp";

interface ScoreBar {
  label: string;
  value: number;
  color: string;
}

const overallScore = 88;
const ticker = "MSFT";

const subScores: ScoreBar[] = [
  { label: "Fundamentals", value: 90, color: "bg-ink" },
  { label: "Momentum", value: 86, color: "bg-ink" },
  { label: "Sentiment", value: 83, color: "bg-ink" },
  { label: "Risk", value: 81, color: "bg-accent-warm" },
];

export function ProofOfWork() {
  return (
    <section id="proof-of-work" className="border-t border-warm-gray bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Label>04 &mdash; Proof of Work</Label>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Editorial text */}
          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
              I don&rsquo;t just consult. I ship products.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-mid-gray">
              Bina Print is an AI-powered scoring system for public companies, built
              end-to-end from data pipelines to consumer interface. Think Zestimate,
              but for stocks.
            </p>
            <p className="mt-4 text-base leading-relaxed text-mid-gray">
              The best portfolio piece is a product that works.
            </p>
            <a
              href="/bina-print"
              className="mt-6 inline-flex items-center gap-1 text-sm text-ink underline underline-offset-4 transition-colors hover:text-mid-gray"
            >
              Explore Bina Print <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          {/* Score card */}
          <div className="rounded-2xl border border-warm-gray bg-paper p-8">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm text-mid-gray">{ticker}</span>
              <CountUp
                end={overallScore}
                className="font-serif text-5xl text-ink"
              />
            </div>
            <p className="mt-1 text-right font-mono text-xs text-mid-gray">Overall Score</p>

            <div className="mt-8 space-y-5">
              {subScores.map((score) => (
                <div key={score.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink">{score.label}</span>
                    <CountUp
                      end={score.value}
                      className="font-mono text-sm text-mid-gray"
                    />
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-warm-gray">
                    {/* The width lives in the markup, not in a motion initial
                        state, so the bar reads correctly before JS runs. The
                        growth is a CSS keyframe (see .score-bar). */}
                    <div
                      className={`score-bar h-full rounded-full ${score.color}`}
                      style={
                        {
                          "--score-bar-width": `${score.value}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
