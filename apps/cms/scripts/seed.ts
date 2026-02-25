/**
 * Seed script for Strapi CMS.
 *
 * Pushes fallback content into Strapi single-type endpoints via the REST API.
 * Uses PUT (upsert) so it is idempotent and safe to re-run.
 *
 * Usage:
 *   STRAPI_URL=https://cms-production-a749.up.railway.app \
 *   STRAPI_API_TOKEN=<token> \
 *   npx tsx scripts/seed.ts
 */

const STRAPI_URL = process.env.STRAPI_URL?.trim();
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN?.trim();

if (!STRAPI_URL) {
  console.error("Missing STRAPI_URL environment variable.");
  process.exit(1);
}

if (!STRAPI_API_TOKEN) {
  console.error("Missing STRAPI_API_TOKEN environment variable.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function putSingleType(
  singularName: string,
  payload: Record<string, unknown>,
  options: { publish?: boolean } = {}
): Promise<void> {
  const params = options.publish ? "?status=published" : "";
  const url = `${STRAPI_URL}/api/${singularName}${params}`;
  const body: Record<string, unknown> = { data: payload };

  console.log(`PUT ${url}`);
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${singularName} — ${response.status} ${response.statusText}: ${text}`);
  }

  console.log(`  ✓ ${singularName} seeded`);
}

// ---------------------------------------------------------------------------
// Content: SiteSettings (draftAndPublish: false)
// ---------------------------------------------------------------------------

const siteSettings = {
  siteName: "Mehdi Zare",
  siteDescription:
    "Principal AI Engineer who ships production AI systems across finance, defense, healthcare, and enterprise. From prototype to production.",
  positioningHeadline: "I take AI from prototype to production.",
  positioningSubheadline:
    "Most AI projects stall between demo and deployment. I'm the engineer who gets them across that gap — because I learn your domain before I write a line of code.",
  positioningHighlight: "because I learn your domain before I write a line of code.",
  credentialLine: "Principal AI Engineer · CFA Charterholder",
  industriesLine: "Finance · Defense · Healthcare · Enterprise",
  locationLine: "Arlington, VA",
  primaryCtaLabel: "Let's Talk",
  primaryCtaHref: "/consulting#book",
  secondaryCtaLabel: "How I work",
  secondaryCtaHref: "/about",
  contactPrompt: "Working on an AI initiative that needs to ship?",
  authorName: "Mehdi Zare, CFA",
  authorRole: "Principal AI Engineer",
  authorBioShort:
    "Principal AI engineer shipping production systems across finance, defense, healthcare, and enterprise.",
  footerText: "© Mehdi Zare",
  bookCallHref: "/consulting#book",
  navItems: [
    { label: "About", href: "/about" },
    { label: "Writing", href: "/blog" },
  ],
  socialLinks: [
    { platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
    { platform: "GitHub", url: "https://github.com/mehdizare" },
    { platform: "Medium", url: "https://medium.com/@mehdi-zare" },
    { platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
  ],
};

// ---------------------------------------------------------------------------
// Content: HomePage (draftAndPublish: true)
// ---------------------------------------------------------------------------

const homePage = {
  heroHeadline: "I take AI from prototype to production.",
  heroSubheadline:
    "Most AI projects stall between demo and deployment. I'm the engineer who gets them across that gap — because I learn your domain before I write a line of code.",
  heroPrimaryCtaLabel: "Let's Talk",
  heroPrimaryCtaHref: "/consulting#book",
  heroSecondaryCtaLabel: "How I work",
  heroSecondaryCtaHref: "/about",
};

// ---------------------------------------------------------------------------
// Content: AboutPage (draftAndPublish: true)
// ---------------------------------------------------------------------------

const aboutPage = {
  title: "About Mehdi Zare",
  positioningStatement:
    "Most AI projects stall between demo and deployment. I'm the engineer who gets them across that gap — because I learn your domain before I write a line of code.",
  stats: [
    { value: "12+", label: "Years building software and AI systems" },
    { value: "10+", label: "AI systems shipped to production" },
    { value: "6+", label: "Products built and shipped end-to-end" },
    { value: "4", label: "Regulated industries shipped in" },
    { value: "CFA", label: "Charterholder" },
    { value: "Secret", label: "Active clearance" },
  ],
  credentials: [
    { title: "CFA Charterholder", issuer: "CFA Institute" },
    {
      title: "AWS Certified Solutions Architect - Associate",
      issuer: "Amazon Web Services",
    },
    { title: "Secret Security Clearance", issuer: "U.S. Government" },
    { title: "Founder Fellow (ODF21)", issuer: "On Deck" },
  ],
  experiences: [
    {
      title: "Principal AI Engineer / Cloud Architect",
      company: "Sev1Tech",
      startDate: "2025",
      current: true,
      description:
        "Built GenAI systems for CISA cybersecurity operations, focused on production observability and threat-informed monitoring in federal environments where reliability is non-negotiable.",
    },
    {
      title: "Senior AI/ML Engineer",
      company: "Booz Allen",
      startDate: "2024",
      endDate: "2025",
      description:
        "Delivered containerized GenAI solutions for government and enterprise teams that needed secure, scalable deployments rather than lab demos.",
    },
    {
      title: "Co-Founder",
      company: "Adviser",
      startDate: "2024",
      endDate: "2024",
      description:
        "Co-built a virtual investment adviser for underrepresented groups, turning natural conversation into personalized financial visualizations people could actually use.",
    },
    {
      title: "Quantitative Analysis Manager",
      company: "Capital One",
      startDate: "2020",
      endDate: "2024",
      description:
        "Led ML-driven liquidity forecasting across finance, data engineering, and compliance teams, bridging quantitative analysis and enterprise decision-making.",
    },
    {
      title: "Senior Consultant",
      company: "FI Consulting",
      startDate: "2019",
      endDate: "2020",
      description:
        "Earned the CFA charter while contributing to financial data series work with the Office of Financial Research, translating policy and market context into usable analytical outputs.",
    },
    {
      title: "Chief AI Scientist",
      company: "Effective World",
      startDate: "2024",
      description:
        "Led AI and data science initiatives to improve audience intelligence and campaign optimization, connecting model outputs to operational marketing decisions.",
    },
    {
      title: "Founder & CEO",
      company: "Fardabook.com",
      startDate: "2011",
      endDate: "2014",
      description:
        "Founded and scaled a textbook-focused online bookstore, owning product, operations, and go-to-market from zero to running business.",
    },
  ],
  education: [
    {
      degree: "MBA",
      field: "Finance",
      institution: "University of Maryland, Smith School of Business",
    },
    {
      degree: "B.S.",
      field: "Physics",
      institution: "University of Tehran",
    },
  ],
  socialLinks: [
    { platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
    { platform: "GitHub", url: "https://github.com/mehdizare" },
    { platform: "Medium", url: "https://medium.com/@mehdi-zare" },
    { platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
  ],
};

// ---------------------------------------------------------------------------
// Content: ConsultingPage (draftAndPublish: true)
// ---------------------------------------------------------------------------

const consultingPage = {
  title: "AI Consulting for High-Stakes Teams",
  subtitle:
    "Most AI projects stall between demo and deployment. I'm the engineer who gets them across that gap — because I learn your domain before I write a line of code.",
  audiences: [
    {
      title: "Financial Services Teams",
      description:
        "Production-ready AI systems for research, risk, operations, and decision support in regulated financial environments.",
    },
    {
      title: "Healthcare and Life Sciences",
      description:
        "Deploy AI workflows where reliability, explainability, and operational safety are requirements, not nice-to-haves.",
    },
    {
      title: "Enterprise AI Teams",
      description:
        "Move AI initiatives from pilot experiments to robust production systems with clear ownership and observability.",
    },
    {
      title: "Government / Defense",
      description: "AI-powered threat and intelligence workflows under strict constraints.",
    },
  ],
  tiers: [
    {
      name: "Advisory",
      priceRange: "Contact for pricing",
      scope: "AI strategy, architecture review, and vendor evaluation.",
    },
    {
      name: "Hands-On Implementation",
      priceRange: "Contact for pricing",
      scope: "Hands-on development with strategic leadership and team mentoring.",
    },
    {
      name: "Fractional AI Lead",
      priceRange: "Contact for pricing",
      scope: "Embedded AI leadership for mission-critical programs with delivery ownership.",
    },
  ],
  faq: [
    {
      question: "What types of organizations do you work with?",
      answer:
        "Most engagements are with regulated or high-stakes teams in finance, healthcare, government, and enterprise settings that need AI outcomes they can defend to stakeholders.",
    },
    {
      question: "How does an engagement begin?",
      answer:
        "We start with a 20-minute discovery call, align on target outcomes, and move into a scoped proposal.",
    },
    {
      question: "Can you work with our existing team?",
      answer:
        "Yes. I typically embed into existing engineering and product teams while transferring delivery practices.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Content: BinaPrintPage (draftAndPublish: true)
// ---------------------------------------------------------------------------

const binaPrintPage = {
  heroHeadline: "Bina Print - A Zestimate for Stocks",
  heroSubheadline:
    "AI-powered company scoring that helps match investment opportunities to your profile.",
  searchPlaceholder: "Look up any company ticker (e.g., MSFT)",
  howItWorks: [
    {
      title: "We analyze fundamentals",
      description:
        "AI agents process financial statements, earnings calls, and SEC filings into structured signals.",
    },
    {
      title: "We score companies 0-100",
      description:
        "The Bina Score summarizes investment quality with explainable sub-score components.",
    },
    {
      title: "We match to your profile",
      description:
        "Scores are interpreted by risk tolerance, sector preference, and time horizon.",
    },
  ],
  topMovers: [
    { ticker: "MSFT", company: "Microsoft", score: 88, scoreChange: 4.2 },
    { ticker: "NVDA", company: "NVIDIA", score: 91, scoreChange: 3.7 },
    { ticker: "AMZN", company: "Amazon", score: 82, scoreChange: 2.9 },
    { ticker: "JPM", company: "JPMorgan", score: 79, scoreChange: 2.5 },
    { ticker: "AAPL", company: "Apple", score: 84, scoreChange: 2.1 },
  ],
  exampleTicker: "MSFT",
  exampleOverallScore: 88,
  exampleSubScores: {
    fundamentals: 90,
    sentiment: 83,
    momentum: 86,
    risk: 81,
  },
  methodologySummary:
    "Bina Print combines structured financial analysis with production-tested AI workflows to produce transparent scores. Methodology prioritizes explainability over black-box outputs.",
};

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`Seeding Strapi at ${STRAPI_URL}\n`);

  await putSingleType("site-setting", siteSettings);
  await putSingleType("home-page", homePage, { publish: true });
  await putSingleType("about-page", aboutPage, { publish: true });
  await putSingleType("consulting-page", consultingPage, { publish: true });
  await putSingleType("bina-print-page", binaPrintPage, { publish: true });

  console.log("\nDone — all content types seeded.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
