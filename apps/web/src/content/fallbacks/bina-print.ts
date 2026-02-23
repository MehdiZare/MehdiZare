import type { BinaMover, BinaStep } from "@/types/strapi";

export const fallbackSteps: BinaStep[] = [
  {
    id: 1,
    title: "We analyze fundamentals",
    description:
      "AI agents process financial statements, earnings calls, and SEC filings into structured signals.",
  },
  {
    id: 2,
    title: "We score companies 0-100",
    description:
      "The Bina Score summarizes investment quality with explainable sub-score components.",
  },
  {
    id: 3,
    title: "We match to your profile",
    description:
      "Scores are interpreted by risk tolerance, sector preference, and time horizon.",
  },
];

export const fallbackMovers: BinaMover[] = [
  { id: 1, ticker: "MSFT", company: "Microsoft", score: 88, scoreChange: 4.2 },
  { id: 2, ticker: "NVDA", company: "NVIDIA", score: 91, scoreChange: 3.7 },
  { id: 3, ticker: "AMZN", company: "Amazon", score: 82, scoreChange: 2.9 },
  { id: 4, ticker: "JPM", company: "JPMorgan", score: 79, scoreChange: 2.5 },
  { id: 5, ticker: "AAPL", company: "Apple", score: 84, scoreChange: 2.1 },
];

export const fallbackBinaPrintData = {
  heroHeadline: "Bina Print - A Zestimate for Stocks",
  heroSubheadline:
    "AI-powered company scoring that helps match investment opportunities to your profile.",
  searchPlaceholder: "Look up any company ticker (e.g., MSFT)",
  howItWorks: fallbackSteps,
  topMovers: fallbackMovers,
  exampleTicker: "MSFT",
  exampleOverallScore: 88,
  exampleSubScores: {
    fundamentals: 90,
    sentiment: 83,
    momentum: 86,
    risk: 81,
  } as Record<string, number>,
  methodologySummary:
    "Bina Print combines structured financial analysis with production-tested AI workflows to produce transparent scores. Methodology prioritizes explainability over black-box outputs.",
};
