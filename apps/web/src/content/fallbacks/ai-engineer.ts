import type { FAQ as FAQType } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export const aiEngineerMetadataTitle = "AI Engineer";

export const aiEngineerKeywords = [
  "AI engineer",
  "AI engineering",
  "production AI systems",
  "LLM engineering",
  "financial AI",
  "quantitative AI",
];

export const aiEngineerCapabilities = [
  {
    id: 1,
    title: "Production LLM systems",
    description:
      "Agents, search, and document intelligence that stay up, stay observable, and stay inside the constraints of a real financial workflow.",
  },
  {
    id: 2,
    title: "Domain-first architecture",
    description:
      "I learn the market, risk, or operations problem before I pick a model. The system has to survive review by people who own P&L and audit.",
  },
  {
    id: 3,
    title: "Delivery past the demo",
    description:
      "Most AI work dies between a working prototype and a Monday-morning product. I take ownership of that gap — evaluation, monitoring, and handoff.",
  },
];

export const aiEngineerProofPoints = [
  {
    id: 1,
    title: "Capital One",
    role: "Quantitative Analysis Manager",
    description:
      "Led machine-learning liquidity forecasting across finance, data engineering, and compliance — the kind of model work that has to reconcile with how a bank actually funds itself.",
  },
  {
    id: 2,
    title: "CFA Charter",
    role: "CFA Institute",
    description:
      "The charter is how I talk risk, valuation, and capital markets with the people who will live with the system — not just the team that built the notebook.",
  },
  {
    id: 3,
    title: "Adviser",
    role: "Co-Founder",
    description:
      "Co-built a virtual investment adviser that turned conversation into personalized financial visualizations people could use, not just admire.",
  },
  {
    id: 4,
    title: "FI Consulting",
    role: "Senior Consultant",
    description:
      "Earned the CFA while contributing financial data work with the Office of Financial Research — translating market and policy context into usable analytical output.",
  },
];

export const aiEngineerFaqs: FAQType[] = [
  {
    id: 1,
    question: "What does an AI engineer do?",
    answer:
      "An AI engineer designs, builds, and operates systems that use models in production. That includes retrieval, agents, evaluation, monitoring, and the product surface — not just training a model in a notebook.",
  },
  {
    id: 2,
    question: "How is an AI engineer different from a data scientist?",
    answer:
      "Data science finds signal. AI engineering ships the system around that signal: APIs, latency, failure modes, governance, and the domain workflow the model has to live in. I do both, but the job is delivery.",
  },
  {
    id: 3,
    question: "Do you work with financial services teams?",
    answer:
      "Yes. Finance is the primary domain — research, risk, liquidity, and decision-support systems that have to stand up to audit and Monday-morning operations.",
  },
  {
    id: 4,
    question: "How do I start working with an AI engineer?",
    answer:
      "Book a 20-minute discovery call. We align on the outcome, the constraints, and whether a production path exists. If it does, you get a scoped proposal — not a slide deck of possibilities.",
  },
];

export interface AiEngineerFallbackData {
  title: string;
  headline: string;
  subtitle: string;
  description: string;
  capabilities: typeof aiEngineerCapabilities;
  proofPoints: typeof aiEngineerProofPoints;
  faq: FAQType[];
}

export function buildAiEngineerFallback(
  siteProfile: SiteProfile
): AiEngineerFallbackData {
  return {
    title: aiEngineerMetadataTitle,
    headline: aiEngineerMetadataTitle,
    subtitle: `${siteProfile.authorName} is an AI engineer who ships production systems in finance — from prototype to something operations can run.`,
    description: `AI engineer ${siteProfile.siteName} ships production AI systems for financial services: LLM products, architecture, and delivery from prototype to production.`,
    capabilities: aiEngineerCapabilities,
    proofPoints: aiEngineerProofPoints,
    faq: aiEngineerFaqs,
  };
}
