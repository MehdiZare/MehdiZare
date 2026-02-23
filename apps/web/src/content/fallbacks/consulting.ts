import type { ConsultingAudience, FAQ as FAQType } from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

export const fallbackAudiences: ConsultingAudience[] = [
  {
    id: 1,
    title: "Financial Services Teams",
    description:
      "Production-ready AI systems for research, risk, operations, and decision support in regulated financial environments.",
  },
  {
    id: 2,
    title: "Healthcare and Life Sciences",
    description:
      "Deploy AI workflows where reliability, explainability, and operational safety are requirements, not nice-to-haves.",
  },
  {
    id: 3,
    title: "Enterprise AI Teams",
    description:
      "Move AI initiatives from pilot experiments to robust production systems with clear ownership and observability.",
  },
  {
    id: 4,
    title: "Government / Defense",
    description: "AI-powered threat and intelligence workflows under strict constraints.",
  },
];

export const fallbackServices = [
  {
    id: 1,
    name: "Advisory",
    scope: "AI strategy, architecture review, and vendor evaluation.",
  },
  {
    id: 2,
    name: "Hands-On Implementation",
    scope: "Hands-on development with strategic leadership and team mentoring.",
  },
  {
    id: 3,
    name: "Fractional AI Lead",
    scope: "Embedded AI leadership for mission-critical programs with delivery ownership.",
  },
];

export const fallbackFaqs: FAQType[] = [
  {
    id: 1,
    question: "What types of organizations do you work with?",
    answer:
      "Most engagements are with regulated or high-stakes teams in finance, healthcare, government, and enterprise settings that need AI outcomes they can defend to stakeholders.",
  },
  {
    id: 2,
    question: "How does an engagement begin?",
    answer:
      "We start with a 20-minute discovery call, align on target outcomes, and move into a scoped proposal.",
  },
  {
    id: 3,
    question: "Can you work with our existing team?",
    answer:
      "Yes. I typically embed into existing engineering and product teams while transferring delivery practices.",
  },
];

export interface ConsultingFallbackData {
  title: string;
  subtitle: string;
  audiences: ConsultingAudience[];
  services: typeof fallbackServices;
  faq: FAQType[];
}

export function buildConsultingFallback(siteProfile: SiteProfile): ConsultingFallbackData {
  return {
    title: "AI Consulting for High-Stakes Teams",
    subtitle: siteProfile.positioningSubheadline,
    audiences: fallbackAudiences,
    services: fallbackServices,
    faq: fallbackFaqs,
  };
}
