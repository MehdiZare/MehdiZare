import type { FAQ as FAQType } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export const aiEngineerMetadataTitle = "AI Engineer";

export const aiEngineerKeywords = [
  "AI engineer",
  "AI engineering",
  "production AI systems",
  "LLM engineering",
  "AI agents",
  "startup AI",
];

export const aiEngineerCapabilities = [
  {
    id: 1,
    title: "Production LLM systems",
    description:
      "Agents, search, and document workflows with review steps, logging, and a cost check.",
  },
  {
    id: 2,
    title: "Domain-first architecture",
    description:
      "I learn the workflow before I pick a tool. The system has to be one your team can keep running.",
  },
  {
    id: 3,
    title: "Delivery past the demo",
    description:
      "Most AI work stalls between a working prototype and a system people use on Monday. I take that stretch: review rules, monitoring, and a short runbook.",
  },
];

export const aiEngineerProofPoints = [
  {
    id: 1,
    title: "Capital One",
    role: "Quantitative Analysis Manager",
    description:
      "Led machine-learning liquidity forecasting across finance, data engineering, and compliance. The model work has to reconcile with how a bank actually funds itself.",
  },
  {
    id: 2,
    title: "CFA Charter",
    role: "CFA Institute",
    description:
      "The charter is how I talk risk, valuation, and capital markets with the people who will live with the system, not just the team that built the notebook.",
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
      "Earned the CFA while contributing financial data work with the Office of Financial Research, translating market and policy context into usable analytical output.",
  },
];

export const aiEngineerFaqs: FAQType[] = [
  {
    id: 1,
    question: "What does an AI engineer do?",
    answer:
      "An AI engineer designs, builds, and operates systems that use models in production. That includes retrieval, agents, evaluation, monitoring, and the product surface, not just training a model in a notebook.",
  },
  {
    id: 2,
    question: "How is an AI engineer different from a data scientist?",
    answer:
      "Data science finds signal. AI engineering ships the system around that signal: APIs, latency, failure modes, governance, and the workflow the model has to live in. I do both, but the job is delivery.",
  },
  {
    id: 3,
    question: "Who do you work with?",
    answer:
      "Founders and CTOs building or scaling AI products, fully remote.",
  },
  {
    id: 4,
    question: "How do I start working with an AI engineer?",
    answer:
      "Book a free 20-minute call. We talk about your product, where it is stuck, and whether I can help. If I can, you get a short written proposal with scope and dates.",
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
    subtitle: `${siteProfile.authorName} is an AI and cloud architect. He builds and runs his own products with AI coding agents, and helps founders and CTOs take theirs from prototype to production, remotely.`,
    description: `AI engineer ${siteProfile.siteName} helps founders and CTOs turn AI prototypes into reliable products. Remote.`,
    capabilities: aiEngineerCapabilities,
    proofPoints: aiEngineerProofPoints,
    faq: aiEngineerFaqs,
  };
}
