"use client";

import { motion } from "framer-motion";
import { Label } from "@/components/shared/Label";

interface TrackRecordEntry {
  org: string;
  monogram: string;
  role: string;
  dates: string;
  description: string;
  category: string;
  categoryColor: string;
  current?: boolean;
}

const entries: TrackRecordEntry[] = [
  {
    org: "Sev1Tech",
    monogram: "S1",
    role: "Principal AI Engineer / Cloud Architect",
    dates: "2025 – Present",
    description:
      "Built GenAI systems for CISA cybersecurity operations, focused on production observability and threat-informed monitoring in federal environments where reliability is non-negotiable.",
    category: "Cybersecurity",
    categoryColor: "bg-red-500/10 text-red-700",
    current: true,
  },
  {
    org: "Booz Allen",
    monogram: "BA",
    role: "Senior AI/ML Engineer",
    dates: "2024 – 2025",
    description:
      "Delivered containerized GenAI solutions for government and enterprise teams that needed secure, scalable deployments rather than lab demos.",
    category: "Defense",
    categoryColor: "bg-blue-500/10 text-blue-700",
  },
  {
    org: "Adviser",
    monogram: "AD",
    role: "Co-Founder",
    dates: "2024 – 2024",
    description:
      "Co-built a virtual investment adviser for underrepresented groups, turning natural conversation into personalized financial visualizations people could actually use.",
    category: "Startup",
    categoryColor: "bg-violet-500/10 text-violet-700",
  },
  {
    org: "Capital One",
    monogram: "C1",
    role: "Quantitative Analysis Manager",
    dates: "2020 – 2024",
    description:
      "Led ML-driven liquidity forecasting across finance, data engineering, and compliance teams, bridging quantitative analysis and enterprise decision-making.",
    category: "Finance",
    categoryColor: "bg-amber-500/10 text-amber-700",
  },
  {
    org: "FI Consulting",
    monogram: "FI",
    role: "Senior Consultant",
    dates: "2019 – 2020",
    description:
      "Earned the CFA charter while contributing to financial data series work with the Office of Financial Research, translating policy and market context into usable analytical outputs.",
    category: "Finance",
    categoryColor: "bg-amber-500/10 text-amber-700",
  },
  {
    org: "Effective World",
    monogram: "EW",
    role: "Chief AI Scientist",
    dates: "2024",
    description:
      "Led AI and data science initiatives to improve audience intelligence and campaign optimization, connecting model outputs to operational marketing decisions.",
    category: "Startup",
    categoryColor: "bg-violet-500/10 text-violet-700",
  },
  {
    org: "Fardabook.com",
    monogram: "FB",
    role: "Founder & CEO",
    dates: "2011 – 2014",
    description:
      "Founded and scaled a textbook-focused online bookstore, owning product, operations, and go-to-market from zero to running business.",
    category: "Startup",
    categoryColor: "bg-violet-500/10 text-violet-700",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { x: -12 },
  visible: {
    x: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export function TrackRecord() {
  return (
    <section id="track-record" className="bg-paper py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Label>03 &mdash; Track Record</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Shipped across industries. Deep in each one.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mid-gray">
          Principal-level AI engineering across four regulated, high-stakes domains. Each
          required learning the business &mdash; not just the tech stack.
        </p>

        {/* Timeline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative mt-12 ml-4 border-l-2 border-warm-gray pl-8 sm:ml-6 sm:pl-12"
        >
          {entries.map((entry) => (
            <motion.div
              key={entry.org}
              variants={itemVariants}
              className="relative pb-10 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[calc(2rem+5px)] top-1 h-2.5 w-2.5 rounded-full border-2 border-warm-gray bg-paper sm:-left-[calc(3rem+5px)]" />

              <div className="flex flex-wrap items-center gap-3">
                {/* Monogram */}
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-warm-gray font-mono text-xs font-medium text-ink">
                  {entry.monogram}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-xl text-ink">{entry.org}</h3>
                  {entry.current && (
                    <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 font-mono text-[0.6rem] font-medium uppercase tracking-wider text-green-700">
                      Current
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-sm font-medium text-ink">{entry.role}</p>
                <span className="font-mono text-xs text-mid-gray">{entry.dates}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium ${entry.categoryColor}`}>
                  {entry.category}
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mid-gray">
                {entry.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
