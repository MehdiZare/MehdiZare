import type { ConsultingAudience, FAQ as FAQType } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export const consultingMetadataTitle = "AI and cloud architecture for founders and CTOs";

export const consultingDescription =
  "AI and cloud architect and CFA. Architecture reviews, prototype-to-production sprints and fractional architect help for founders and CTOs building AI products. Remote.";

export const consultingHeadline =
  "Get your AI product from prototype to production, with the controls in place.";

export const fallbackAudiences: ConsultingAudience[] = [
  {
    id: 1,
    title: "Founders with a working AI prototype",
    description:
      "Customers like the demo. Now it has to survive real traffic, failed jobs and edge cases.",
  },
  {
    id: 2,
    title: "CTOs scaling an AI product",
    description:
      "Model calls, workers and data pipelines grew fast. You want an architecture your team can own and reason about.",
  },
  {
    id: 3,
    title: "Small teams shipping with coding agents",
    description:
      "You use Claude Code, Codex, Cursor or similar and want delegation, review and CI you can trust.",
  },
];

export interface ConsultingOffer {
  id: number;
  name: string;
  scope: string;
  details: string[];
}

export const fallbackServices: ConsultingOffer[] = [
  {
    id: 1,
    name: "AI product architecture review",
    scope: "About 1 to 2 weeks. You get a written plan.",
    details: [
      "I review how your AI product is built: model calls, agents and workers, data ownership, evaluation, failure handling and cloud setup.",
      "You get a written plan covering what to fix first, where a job can fail halfway, which steps need retries or a human approval, what to measure, and where the model and cloud cost goes.",
      "Good first step if the prototype works and you're not sure it will hold up.",
    ],
  },
  {
    id: 2,
    name: "Prototype-to-production sprint",
    scope: "2 to 4 weeks. One critical path, end to end, with a short runbook.",
    details: [
      "I take one critical path of your product from prototype to production in your stack: workers and retries, approval steps, evaluation checks, logging, cost visibility, CI and deployment.",
      "Your team owns it at the end, with a short runbook.",
    ],
  },
  {
    id: 3,
    name: "Fractional AI and cloud architect",
    scope: "Monthly. Includes a weekly check-in.",
    details: [
      "Part-time architect for a founder or a small team.",
      "I review designs and what your team and its agents ship, make the model and build-versus-buy calls with you, and keep reliability and cost in check.",
      "Includes a weekly check-in and async help.",
    ],
  },
];

export interface ConsultingProof {
  id: number;
  name: string;
  href: string;
  description: string;
}

export const fallbackProof: ConsultingProof[] = [
  {
    id: 1,
    name: "Bina Capital",
    href: "https://bina.capital",
    description:
      "Free, comparison-first education for new US investors. A part-time side project I build and run with AI coding agents. Education only, not advice.",
  },
  {
    id: 2,
    name: "Rewardopedia",
    href: "https://rewardopedia.com",
    description:
      "A credit card rewards guide led by Mary Massoumi, Founder and CEO.",
  },
  {
    id: 3,
    name: "RoboWrite",
    href: "https://robowrite.ai",
    description: "A content operations platform for agencies.",
  },
];

export const fallbackNotAFit: string[] = [
  "Large enterprise programs with long procurement.",
  "Work that needs on-site presence or a security clearance.",
  "Investment advice or financial planning. I don't give it.",
  "\"Build us a chatbot by Friday\" with no owner on your side.",
];

export const fallbackHowItWorks: string[] = [
  "Free 20-minute call. We talk about your product, where it is stuck, and whether I can help.",
  "Short written proposal with scope and dates.",
  "Work starts. Everything is remote, with async updates and a weekly call.",
];

export const fallbackFaqs: FAQType[] = [
  {
    id: 1,
    question: "Who do you work with?",
    answer:
      "Founders and CTOs building or scaling AI products, fully remote.",
  },
  {
    id: 2,
    question: "Can you work with our existing team?",
    answer:
      "Yes. Most of the work is leaving your team with a system it can run and change without me.",
  },
  {
    id: 3,
    question: "Do you only use one AI vendor?",
    answer:
      "No. I use Claude Code, Codex, opencode and cursor-agent side by side, and I pick based on the task and the cost.",
  },
  {
    id: 4,
    question: "Are you full time?",
    answer: "No. I take a small number of clients at a time.",
  },
];

export interface ConsultingFallbackData {
  title: string;
  subtitle: string;
  audiences: ConsultingAudience[];
  services: ConsultingOffer[];
  proof: ConsultingProof[];
  notAFit: string[];
  howItWorks: string[];
  faq: FAQType[];
}

export function buildConsultingFallback(siteProfile: SiteProfile): ConsultingFallbackData {
  return {
    title: consultingHeadline,
    subtitle: siteProfile.positioningSubheadline,
    audiences: fallbackAudiences,
    services: fallbackServices,
    proof: fallbackProof,
    notAFit: fallbackNotAFit,
    howItWorks: fallbackHowItWorks,
    faq: fallbackFaqs,
  };
}
