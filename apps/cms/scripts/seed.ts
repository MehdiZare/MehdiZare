/**
 * Seed script for Strapi CMS.
 *
 * Writes the records apps/web still reads: author, categories, tags, and the
 * author relation on articles. Page copy and site identity live in the repo
 * (`apps/web/src/content/fallbacks/` and `site-profile-defaults.ts`); seeding
 * `home-page` / `about-page` / `consulting-page` / `bina-print-page` /
 * `site-setting` was writing rows whose admin edits now silently do
 * nothing (#116). The Strapi types stay so their tables are not dropped.
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

async function main(): Promise<void> {
  console.log(`Seeding Strapi at ${STRAPI_URL}\n`);

  const author = await upsertAuthorBySlug(primaryAuthor.slug, primaryAuthor, { publish: true });
  console.log(`  ✓ author seeded (${author.slug})`);

  await seedCategories();
  await seedTags();
  await linkAllArticlesToAuthor(author);

  console.log("\nDone — author, categories, and tags seeded.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
