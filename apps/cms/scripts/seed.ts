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

import { readFileSync } from "fs";
import { resolve } from "path";

const taxonomy = JSON.parse(
  readFileSync(resolve(__dirname, "../../../data/taxonomy.json"), "utf-8")
);

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

interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

interface StrapiEntityResponse<T> {
  data: T;
}

interface AuthorRecord {
  id: number;
  documentId: string;
  slug: string;
  name: string;
}

interface ArticleRecord {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  author?: {
    id: number;
    documentId: string;
    slug?: string;
  };
}

interface CategoryRecord {
  id: number;
  documentId: string;
  slug: string;
  name: string;
}

interface TagRecord {
  id: number;
  documentId: string;
  slug: string;
  name: string;
}

function buildUrl(path: string, query: Record<string, string> = {}): string {
  const url = new URL(`/api/${path}`, STRAPI_URL);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

async function strapiFetch<T>(
  path: string,
  init: RequestInit,
  query: Record<string, string> = {}
): Promise<T> {
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${path} — ${response.status} ${response.statusText}: ${text}`);
  }

  return (await response.json()) as T;
}

async function putSingleType(
  singularName: string,
  payload: Record<string, unknown>,
  options: { publish?: boolean } = {}
): Promise<void> {
  const body: Record<string, unknown> = { data: payload };

  console.log(`PUT /api/${singularName}`);
  await strapiFetch<unknown>(singularName, {
    method: "PUT",
    body: JSON.stringify(body),
  }, options.publish ? { status: "published" } : {});

  console.log(`  ✓ ${singularName} seeded`);
}

async function upsertAuthorBySlug(
  slug: string,
  payload: Record<string, unknown>,
  options: { publish?: boolean } = {}
): Promise<AuthorRecord> {
  const existing = await strapiFetch<StrapiCollectionResponse<AuthorRecord>>("authors", {
    method: "GET",
  }, {
    "filters[slug][$eq]": slug,
    "pagination[pageSize]": "1",
  });

  const query = options.publish ? { status: "published" } : {};

  if (existing.data.length > 0) {
    const author = existing.data[0];
    const response = await strapiFetch<StrapiEntityResponse<AuthorRecord>>(
      `authors/${author.documentId}`,
      {
        method: "PUT",
        body: JSON.stringify({ data: payload }),
      },
      query
    );
    return response.data;
  }

  const created = await strapiFetch<StrapiEntityResponse<AuthorRecord>>(
    "authors",
    {
      method: "POST",
      body: JSON.stringify({ data: payload }),
    },
    query
  );

  return created.data;
}

async function getAllArticles(): Promise<ArticleRecord[]> {
  const articles: ArticleRecord[] = [];
  const pageSize = 100;
  let page = 1;

  while (true) {
    const response = await strapiFetch<StrapiCollectionResponse<ArticleRecord>>("articles", {
      method: "GET",
    }, {
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
      "pagination[withCount]": "true",
      "populate[author][populate]": "*",
    });

    articles.push(...response.data);

    const pageCount = response.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      break;
    }

    page += 1;
  }

  return articles;
}

async function linkAllArticlesToAuthor(author: AuthorRecord): Promise<void> {
  const forceOverwrite = process.env.SEED_FORCE_AUTHOR_OVERWRITE === "true";
  const articles = await getAllArticles();
  if (articles.length === 0) {
    console.log("  • No articles found to backfill author relation.");
    return;
  }

  let updatedCount = 0;
  for (const article of articles) {
    if (article.author?.documentId === author.documentId) {
      continue;
    }
    if (article.author?.documentId && !forceOverwrite) {
      continue;
    }

    await strapiFetch<unknown>(`articles/${article.documentId}`, {
      method: "PUT",
      body: JSON.stringify({
        data: {
          author: author.documentId,
        },
      }),
    }, {
      status: "published",
    });

    updatedCount += 1;
  }

  console.log(`  ✓ Linked ${updatedCount} article(s) to author "${author.name}"`);
}

async function upsertCategoryBySlug(
  slug: string,
  payload: Record<string, unknown>
): Promise<CategoryRecord> {
  const existing = await strapiFetch<StrapiCollectionResponse<CategoryRecord>>("categories", {
    method: "GET",
  }, {
    "filters[slug][$eq]": slug,
    "pagination[pageSize]": "1",
  });

  if (existing.data.length > 0) {
    const category = existing.data[0];
    const response = await strapiFetch<StrapiEntityResponse<CategoryRecord>>(
      `categories/${category.documentId}`,
      {
        method: "PUT",
        body: JSON.stringify({ data: payload }),
      }
    );
    return response.data;
  }

  const created = await strapiFetch<StrapiEntityResponse<CategoryRecord>>(
    "categories",
    {
      method: "POST",
      body: JSON.stringify({ data: payload }),
    }
  );

  return created.data;
}

async function upsertTagBySlug(
  slug: string,
  payload: Record<string, unknown>
): Promise<TagRecord> {
  const existing = await strapiFetch<StrapiCollectionResponse<TagRecord>>("tags", {
    method: "GET",
  }, {
    "filters[slug][$eq]": slug,
    "pagination[pageSize]": "1",
  });

  if (existing.data.length > 0) {
    const tag = existing.data[0];
    const response = await strapiFetch<StrapiEntityResponse<TagRecord>>(
      `tags/${tag.documentId}`,
      {
        method: "PUT",
        body: JSON.stringify({ data: payload }),
      }
    );
    return response.data;
  }

  const created = await strapiFetch<StrapiEntityResponse<TagRecord>>(
    "tags",
    {
      method: "POST",
      body: JSON.stringify({ data: payload }),
    }
  );

  return created.data;
}

interface TaxonomyCategory {
  name: string;
  slug: string;
  order: number;
  parent?: string | null;
  description: string;
  headline: string;
  intro: string;
  seo: Record<string, unknown>;
  children?: TaxonomyCategory[];
}

interface TaxonomyTag {
  name: string;
  slug: string;
  description: string;
  headline: string;
  intro: string;
  seo: Record<string, unknown>;
}

async function seedCategories(): Promise<void> {
  if (!Array.isArray(taxonomy.categories)) {
    console.error("taxonomy.json: expected 'categories' to be an array.");
    process.exit(1);
  }
  const categories: TaxonomyCategory[] = taxonomy.categories;
  const slugToDocumentId: Record<string, string> = {};

  // Pass 1: Create all categories with flat fields (no parent relations)
  for (const parent of categories) {
    const record = await upsertCategoryBySlug(parent.slug, {
      name: parent.name,
      slug: parent.slug,
      description: parent.description,
      order: parent.order,
      headline: parent.headline,
      intro: parent.intro,
      seo: parent.seo,
    });
    slugToDocumentId[parent.slug] = record.documentId;
    console.log(`  ✓ category seeded: ${parent.slug}`);

    if (parent.children) {
      for (const child of parent.children) {
        const childRecord = await upsertCategoryBySlug(child.slug, {
          name: child.name,
          slug: child.slug,
          description: child.description,
          order: child.order,
          headline: child.headline,
          intro: child.intro,
          seo: child.seo,
        });
        slugToDocumentId[child.slug] = childRecord.documentId;
        console.log(`  ✓ category seeded: ${child.slug}`);
      }
    }
  }

  // Pass 2: Link parent/child relations
  for (const parent of categories) {
    if (parent.children) {
      for (const child of parent.children) {
        const parentDocId = slugToDocumentId[parent.slug];
        const childDocId = slugToDocumentId[child.slug];
        if (parentDocId && childDocId) {
          await strapiFetch<StrapiEntityResponse<CategoryRecord>>(
            `categories/${childDocId}`,
            {
              method: "PUT",
              body: JSON.stringify({
                data: { parent: parentDocId },
              }),
            }
          );
        }
      }
    }
  }
  console.log("  ✓ category parent/child relations linked");
}

async function seedTags(): Promise<void> {
  if (!Array.isArray(taxonomy.tags)) {
    console.error("taxonomy.json: expected 'tags' to be an array.");
    process.exit(1);
  }
  const tags: TaxonomyTag[] = taxonomy.tags;

  for (const tag of tags) {
    await upsertTagBySlug(tag.slug, {
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      headline: tag.headline,
      intro: tag.intro,
      seo: tag.seo,
    });
    console.log(`  ✓ tag seeded: ${tag.slug}`);
  }
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
  locationLine: "Miami, FL",
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
    { platform: "Website", url: "https://www.mehdi-zare.com" },
    { platform: "LinkedIn", url: "https://linkedin.com/in/mehdizare" },
    { platform: "GitHub", url: "https://github.com/mehdizare" },
    { platform: "Medium", url: "https://medium.com/@mehdi-zare" },
    { platform: "Seeking Alpha", url: "https://seekingalpha.com/author/mehdi-zare" },
  ],
};

if (!Array.isArray(taxonomy.authors)) {
  console.error("taxonomy.json: expected 'authors' to be an array.");
  process.exit(1);
}

const primaryAuthor = taxonomy.authors.find(
  (a: { isPrimary?: boolean }) => a.isPrimary
) ?? taxonomy.authors[0];

if (!primaryAuthor) {
  console.error("No authors found in taxonomy.json");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Content: HomePage (draftAndPublish: true)
// ---------------------------------------------------------------------------

// Derived from `siteSettings`, not restated (#101).
//
// Seed-only after #100: apps/web reads `buildHomeFallback` / DEFAULT_SITE_PROFILE
// directly and no longer prefers this `home-page` row at runtime. Kept so an
// admin who opens Strapi still sees copy that matches the repo, and so the
// identity tripwire can flag seed↔repo drift before anyone reintroduces the
// round trip. Referencing siteSettings (instead of restating literals) is what
// keeps that drift unrepresentable.
const homePage = {
  heroHeadline: siteSettings.positioningHeadline,
  heroSubheadline: siteSettings.positioningSubheadline,
  heroPrimaryCtaLabel: siteSettings.primaryCtaLabel,
  heroPrimaryCtaHref: siteSettings.primaryCtaHref,
  heroSecondaryCtaLabel: siteSettings.secondaryCtaLabel,
  heroSecondaryCtaHref: siteSettings.secondaryCtaHref,
};

// ---------------------------------------------------------------------------
// Content: AboutPage (draftAndPublish: true)
// ---------------------------------------------------------------------------

const aboutPage = {
  title: "About Mehdi Zare",
  // Same derivation as homePage above (#101): buildAboutFallback maps
  // positioningStatement <- siteProfile.positioningSubheadline.
  positioningStatement: siteSettings.positioningSubheadline,
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
      company: primaryAuthor.worksForName as string,
      startDate: "2025",
      current: true,
      description:
        "Built GenAI systems for federal cybersecurity operations, focused on production observability and threat-informed monitoring in federal environments where reliability is non-negotiable.",
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
  // Same derivation as homePage above (#101). Seed-only after #100: apps/web
  // reads buildConsultingFallback for both the <h1> and generateMetadata, so a
  // stale literal here no longer reaches production. Still derived from
  // siteSettings so seed↔repo drift stays unrepresentable until the CMS page
  // types are retired.
  subtitle: siteSettings.positioningSubheadline,
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

  const author = await upsertAuthorBySlug(primaryAuthor.slug, primaryAuthor, { publish: true });
  console.log(`  ✓ author seeded (${author.slug})`);

  await seedCategories();
  await seedTags();

  await putSingleType("site-setting", siteSettings);
  await putSingleType("home-page", homePage, { publish: true });
  await putSingleType("about-page", aboutPage, { publish: true });
  await putSingleType("consulting-page", consultingPage, { publish: true });
  await putSingleType("bina-print-page", binaPrintPage, { publish: true });
  await linkAllArticlesToAuthor(author);

  console.log("\nDone — all content types seeded.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
