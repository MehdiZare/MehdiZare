import taxonomy from "../../../../data/taxonomy.json";
import { blankToUndefined } from "./strings";

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

function toCategorySeed(
  node: TaxonomyCategoryNode,
  parentSlug?: string
): CategorySeed | null {
  const slug = blankToUndefined(node.slug);
  if (!slug) {
    return null;
  }

  const children = (node.children ?? [])
    .map((child) => {
      const childSlug = blankToUndefined(child.slug);
      if (!childSlug) {
        return null;
      }

      return {
        name: blankToUndefined(child.name),
        slug: childSlug,
        description: blankToUndefined(child.description),
        headline: blankToUndefined(child.headline),
        intro: blankToUndefined(child.intro),
      };
    })
    .filter((child): child is NonNullable<typeof child> => child !== null);

  return {
    name: blankToUndefined(node.name),
    slug,
    description: blankToUndefined(node.description),
    headline: blankToUndefined(node.headline),
    intro: blankToUndefined(node.intro),
    parentSlug,
    children,
  };
}

function toTagSeed(node: TaxonomyTagNode): TagSeed | null {
  const slug = blankToUndefined(node.slug);
  if (!slug) {
    return null;
  }

  return {
    name: blankToUndefined(node.name),
    slug,
    description: blankToUndefined(node.description),
    headline: blankToUndefined(node.headline),
    intro: blankToUndefined(node.intro),
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

let categorySeedMap: Map<string, CategorySeed>;
let tagSeedMap: Map<string, TagSeed>;

try {
  const taxonomySeed = taxonomy as TaxonomySeedData;
  categorySeedMap = buildCategorySeedMap(taxonomySeed);
  tagSeedMap = buildTagSeedMap(taxonomySeed);
} catch (error) {
  console.warn("[taxonomy-seed] Failed to initialise taxonomy maps:", error);
  categorySeedMap = new Map();
  tagSeedMap = new Map();
}

export function getCategorySeedBySlug(slug: string): CategorySeed | undefined {
  return categorySeedMap.get(slug);
}

export function getTagSeedBySlug(slug: string): TagSeed | undefined {
  return tagSeedMap.get(slug);
}
