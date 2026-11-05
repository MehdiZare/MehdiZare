import type { ConsultingAudience, FAQ as FAQType } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export const consultingMetadataTitle = "AI agent setup for founders and small teams";

export const consultingDescription =
  "A CFA and solo founder who runs his own products with AI agents. Audits, build sprints and fractional AI-ops help for startups and small businesses. Remote.";

export const consultingHeadline =
  "Put AI agents to work in your company, with review and controls.";

export const fallbackAudiences: ConsultingAudience[] = [
  {
    id: 1,
    title: "Founder-led startups",
    description: "Teams that want agents doing real work, not demos.",
  },
  {
    id: 2,
    title: "Small and mid-size businesses",
    description:
      "A few repeat workflows (content, support, reporting, internal tools) that eat hours every week.",
  },
  {
    id: 3,
    title: "Small product teams",
    description:
      "Teams that already use Claude Code, Codex, Cursor or similar and want a setup that doesn't need babysitting.",
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
    name: "Agent workflow audit",
    scope: "About 1 to 2 weeks. You get a written plan.",
    details: [
      "I review how your team uses AI tools today, or one workflow you want to hand to agents.",
      "You get a written plan covering what to automate, what to keep human, which tools to use, the review rules, the expected monthly model cost, and what can go wrong.",
      "Good first step if you're not sure where to start.",
    ],
  },
  {
    id: 2,
    name: "Build sprint",
    scope: "2 to 4 weeks. One workflow end to end, with a short runbook.",
    details: [
      "I set up one agent workflow end to end in your stack: the prompts and skills, the handoffs between tools, review and approval steps, logging, and a cost check.",
      "Your team owns it at the end, with a short runbook.",
    ],
  },
  {
    id: 3,
    name: "Fractional AI-ops lead or CTO",
    scope: "Monthly. Includes a weekly check-in.",
    details: [
      "Part-time technical lead for a small team.",
      "I run the agent setup, review what the agents ship, pick tools, and keep costs in check.",
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
  "Free 20-minute call. We talk about one workflow and whether I can help.",
  "Short written proposal with scope and dates.",
  "Work starts. Everything is remote, with async updates and a weekly call.",
];

export const fallbackFaqs: FAQType[] = [
  {
    id: 1,
    question: "Who do you work with?",
    answer:
      "Founder-led startups and small and mid-size businesses, fully remote.",
  },
  {
    id: 2,
    question: "Can you work with our existing team?",
    answer:
      "Yes. Most of the work is setting up a system your team keeps running.",
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
