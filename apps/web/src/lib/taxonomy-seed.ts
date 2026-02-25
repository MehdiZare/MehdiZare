import taxonomy from "../../../../data/taxonomy.json";

interface TaxonomyCategoryNode {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  headline?: unknown;
  intro?: unknown;
  children?: TaxonomyCategoryNode[];
}

interface TaxonomyTagNode {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  headline?: unknown;
  intro?: unknown;
}

interface TaxonomySeedData {
  categories?: TaxonomyCategoryNode[];
  tags?: TaxonomyTagNode[];
}

export interface CategorySeed {
  name?: string;
  slug: string;
  description?: string;
  headline?: string;
  intro?: string;
  parentSlug?: string;
  children: Array<{
    name?: string;
    slug: string;
    description?: string;
    headline?: string;
    intro?: string;
  }>;
}

export interface TagSeed {
  name?: string;
  slug: string;
  description?: string;
  headline?: string;
  intro?: string;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toCategorySeed(
  node: TaxonomyCategoryNode,
  parentSlug?: string
): CategorySeed | null {
  const slug = normalizeString(node.slug);
  if (!slug) {
    return null;
  }

  const children = (node.children ?? [])
    .map((child) => {
      const childSlug = normalizeString(child.slug);
      if (!childSlug) {
        return null;
      }

      return {
        name: normalizeString(child.name),
        slug: childSlug,
        description: normalizeString(child.description),
        headline: normalizeString(child.headline),
        intro: normalizeString(child.intro),
      };
    })
    .filter((child): child is NonNullable<typeof child> => child !== null);

  return {
    name: normalizeString(node.name),
    slug,
    description: normalizeString(node.description),
    headline: normalizeString(node.headline),
    intro: normalizeString(node.intro),
    parentSlug,
    children,
  };
}

function toTagSeed(node: TaxonomyTagNode): TagSeed | null {
  const slug = normalizeString(node.slug);
  if (!slug) {
    return null;
  }

  return {
    name: normalizeString(node.name),
    slug,
    description: normalizeString(node.description),
    headline: normalizeString(node.headline),
    intro: normalizeString(node.intro),
  };
}

function buildCategorySeedMap(input: TaxonomySeedData): Map<string, CategorySeed> {
  const map = new Map<string, CategorySeed>();

  (input.categories ?? []).forEach((categoryNode) => {
    const parentSeed = toCategorySeed(categoryNode);
    if (!parentSeed) {
      return;
    }

    map.set(parentSeed.slug, parentSeed);

    parentSeed.children.forEach((child) => {
      const childSeed = toCategorySeed(
        {
          ...child,
          children: [],
        },
        parentSeed.slug
      );

      if (!childSeed) {
        return;
      }

      map.set(childSeed.slug, childSeed);
    });
  });

  return map;
}

function buildTagSeedMap(input: TaxonomySeedData): Map<string, TagSeed> {
  const map = new Map<string, TagSeed>();

  (input.tags ?? []).forEach((tagNode) => {
    const tagSeed = toTagSeed(tagNode);
    if (!tagSeed) {
      return;
    }

    map.set(tagSeed.slug, tagSeed);
  });

  return map;
}

const taxonomySeed = taxonomy as TaxonomySeedData;
const categorySeedMap = buildCategorySeedMap(taxonomySeed);
const tagSeedMap = buildTagSeedMap(taxonomySeed);

export function getCategorySeedBySlug(slug: string): CategorySeed | undefined {
  return categorySeedMap.get(slug);
}

export function getTagSeedBySlug(slug: string): TagSeed | undefined {
  return tagSeedMap.get(slug);
}
