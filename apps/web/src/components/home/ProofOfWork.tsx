"use client";

import { motion } from "framer-motion";

interface ScoreBar {
  label: string;
  value: number;
  color: string;
}

const overallScore = 88;
const ticker = "MSFT";

const subScores: ScoreBar[] = [
  { label: "Fundamentals", value: 92, color: "bg-ink" },
  { label: "Momentum", value: 85, color: "bg-ink" },
  { label: "Sentiment", value: 88, color: "bg-ink" },
  { label: "Risk", value: 80, color: "bg-accent-warm" },
];

export function ProofOfWork() {
  return (
    <section className="bg-[#f4f3f0] py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          04 &mdash; Proof of Work
        </p>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Editorial text */}
          <div>
            <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Bina Print: a Zestimate for stocks.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-mid-gray">
              I built Bina Print to prove that AI can deliver institutional-grade
              equity analysis at scale. It scores every stock across fundamentals,
              momentum, sentiment, and risk &mdash; giving retail investors the same
              signal quality that hedge funds keep behind paywalls.
            </p>
            <p className="mt-4 text-base leading-relaxed text-mid-gray">
              This is not a concept deck. It&rsquo;s a working product &mdash;
              processing market data daily and publishing actionable scores.
            </p>
          </div>

          {/* Score card */}
          <div className="rounded-2xl border border-warm-gray bg-paper p-8">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-sm text-mid-gray">{ticker}</span>
              <span className="font-serif text-5xl text-ink">{overallScore}</span>
            </div>
            <p className="mt-1 text-right font-mono text-xs text-mid-gray">Overall Score</p>

            <div className="mt-8 space-y-5">
              {subScores.map((score) => (
                <div key={score.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink">{score.label}</span>
                    <span className="font-mono text-sm text-mid-gray">{score.value}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-warm-gray">
                    <motion.div
                      className={`h-full rounded-full ${score.color}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${score.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
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
