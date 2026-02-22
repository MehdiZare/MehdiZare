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
    dates: "2024 – Present",
    description:
      "GenAI systems for CISA cybersecurity operations. Databricks-first pipelines, model observability, and threat-informed monitoring in production federal environments.",
    category: "Cybersecurity",
    categoryColor: "bg-red-500/10 text-red-700",
    current: true,
  },
  {
    org: "Booz Allen",
    monogram: "BA",
    role: "Senior AI/ML Engineer",
    dates: "2022 – 2023",
    description:
      "Delivered containerized GenAI solutions with LangChain and AWS Bedrock for government and enterprise clients at scale.",
    category: "Defense",
    categoryColor: "bg-blue-500/10 text-blue-700",
  },
  {
    org: "Adviser",
    monogram: "AD",
    role: "Co-Founder",
    dates: "2024 – 2024",
    description:
      "Built a virtual investment adviser for underrepresented groups — generative AI that creates personalized financial visualizations from natural conversation.",
    category: "Startup",
    categoryColor: "bg-violet-500/10 text-violet-700",
  },
  {
    org: "Capital One",
    monogram: "C1",
    role: "Quantitative Analysis Manager",
    dates: "2020 – 2022",
    description:
      "ML-driven liquidity forecasting. Time series, TensorFlow, NLP — bridging finance teams, data engineering, and compliance. This is where I earned the CFA.",
    category: "Finance",
    categoryColor: "bg-amber-500/10 text-amber-700",
  },
  {
    org: "FI Consulting",
    monogram: "FI",
    role: "Senior Consultant",
    dates: "2019 – 2020",
    description:
      "Financial data series published by OFR — Office of Financial Research, Department of Treasury. Data-driven consulting at the intersection of finance, policy, and technology.",
    category: "Finance",
    categoryColor: "bg-amber-500/10 text-amber-700",
  },
  {
    org: "Effective World",
    monogram: "EW",
    role: "Chief AI Scientist",
    dates: "2015 – 2019",
    description:
      "Led AI and data science at a global digital marketing agency — building predictive models, audience intelligence, and automated campaign optimization at scale.",
    category: "Startup",
    categoryColor: "bg-violet-500/10 text-violet-700",
  },
  {
    org: "Fardabook.com",
    monogram: "FB",
    role: "Founder & CEO",
    dates: "2012 – 2014",
    description:
      "Founded and scaled the leading online bookshop focused on textbooks — end-to-end product development, e-commerce operations, and go-to-market strategy.",
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
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
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
