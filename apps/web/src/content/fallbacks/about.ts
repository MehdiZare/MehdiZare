import type {
  Credential,
  Education,
  Experience,
  SocialLink,
  StatItem,
  BlocksContent,
} from "@/types/strapi";
import type { SiteProfile } from "@/lib/site-profile";

function buildCanonicalAboutStory(_siteProfile: SiteProfile): string[] {
  return [
    "I studied physics because I wanted to understand how things work from first principles. But I was never just a theorist — while earning my degree at the University of Tehran, I was already writing code and building products. That tension between rigorous analysis and the urge to ship something real has defined my entire career.",
    "Fardabook.com was the first proof. I founded a textbook-focused online bookstore and ran product, operations, and go-to-market from scratch. It taught me that building a company and building software are the same discipline: figure out what people need, then engineer a system that delivers it reliably.",
    "I came to the U.S. for an MBA in Finance at the University of Maryland's Smith School of Business. That's where I discovered quantitative finance and started pursuing the CFA charter. I earned it while working at FI Consulting with the Office of Financial Research. The CFA didn't just add a credential — it gave me the language to operate inside regulated, high-stakes environments.",
    "Today I build production AI systems — the kind that run in federal cybersecurity operations, government defense programs, and Fortune 500 financial institutions. The physics taught me to think in systems. The finance taught me to speak the language of risk. The entrepreneurship taught me to ship. That combination is how I take AI from prototype to production in domains where failure isn't an option.",
  ];
}

export const fallbackStats: StatItem[] = [
  { id: 1, value: "12+", label: "Years building software and AI systems" },
  { id: 2, value: "10+", label: "AI systems shipped to production" },
  { id: 3, value: "6+", label: "Products built and shipped end-to-end" },
  { id: 4, value: "4", label: "Regulated industries shipped in" },
  { id: 5, value: "CFA", label: "Charterholder" },
  { id: 6, value: "Secret", label: "Active clearance" },
];

export const fallbackCredentials: Credential[] = [
  { id: 1, title: "CFA Charterholder", issuer: "CFA Institute" },
  {
    id: 2,
    title: "AWS Certified Solutions Architect - Associate",
    issuer: "Amazon Web Services",
  },
  { id: 3, title: "Secret Security Clearance", issuer: "U.S. Government" },
];

export const fallbackExperiences: Experience[] = [
  {
    id: 1,
    title: "Principal AI Engineer / Cloud Architect",
    company: "Sev1Tech",
    startDate: "2024",
    current: true,
    description:
      "Built GenAI systems for CISA cybersecurity operations, focused on production observability and threat-informed monitoring in federal environments where reliability is non-negotiable.",
  },
  {
    id: 2,
    title: "Senior AI/ML Engineer",
    company: "Booz Allen",
    startDate: "2022",
    endDate: "2023",
    description:
      "Delivered containerized GenAI solutions for government and enterprise teams that needed secure, scalable deployments rather than lab demos.",
  },
  {
    id: 3,
    title: "Co-Founder",
    company: "Adviser",
    startDate: "2024",
    endDate: "2024",
    description:
      "Co-built a virtual investment adviser for underrepresented groups, turning natural conversation into personalized financial visualizations people could actually use.",
  },
  {
    id: 4,
    title: "Quantitative Analysis Manager",
    company: "Capital One",
    startDate: "2020",
    endDate: "2022",
    description:
      "Led ML-driven liquidity forecasting across finance, data engineering, and compliance teams, bridging quantitative analysis and enterprise decision-making.",
  },
  {
    id: 5,
    title: "Senior Consultant",
    company: "FI Consulting",
    startDate: "2019",
    endDate: "2020",
    description:
      "Earned the CFA charter while contributing to financial data series work with the Office of Financial Research, translating policy and market context into usable analytical outputs.",
  },
  {
    id: 6,
    title: "Chief AI Scientist",
    company: "Effective World",
    startDate: "2015",
    endDate: "2019",
    description:
      "Led AI and data science initiatives to improve audience intelligence and campaign optimization, connecting model outputs to operational marketing decisions.",
  },
  {
    id: 7,
    title: "Founder & CEO",
    company: "Fardabook.com",
    startDate: "2012",
    endDate: "2014",
    description:
      "Founded and scaled a textbook-focused online bookstore, owning product, operations, and go-to-market from zero to running business.",
  },
];

export const fallbackEducation: Education[] = [
  {
    id: 1,
    degree: "MBA",
    field: "Finance",
    institution: "University of Maryland, Smith School of Business",
  },
  {
    id: 2,
    degree: "B.S.",
    field: "Physics",
    institution: "University of Tehran",
  },
];

export interface AboutFallbackData {
  title: string;
  positioningStatement: string;
  story: string[];
  storyBlocks: BlocksContent | undefined;
  stats: StatItem[];
  credentials: Credential[];
  experiences: Experience[];
  education: Education[];
  socialLinks: SocialLink[];
}

export function buildAboutFallback(siteProfile: SiteProfile): AboutFallbackData {
  return {
    title: `About ${siteProfile.siteName}`,
    positioningStatement: siteProfile.positioningSubheadline,
    story: buildCanonicalAboutStory(siteProfile),
    storyBlocks: undefined,
    stats: fallbackStats,
    credentials: fallbackCredentials,
    experiences: fallbackExperiences,
    education: fallbackEducation,
    socialLinks: siteProfile.socialLinks,
  };
}
