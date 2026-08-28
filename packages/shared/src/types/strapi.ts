// Strapi base types
export interface StrapiResponse<T> {
  data: T;
  meta: StrapiMeta;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta: StrapiMeta;
}

export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiImage {
  id: number;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  };
}

export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
}

// SEO Component
export interface SEO {
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: StrapiImage | null;
}

// Content Types
export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: BlocksContent;
  excerpt: string | null;
  featuredImage: StrapiImage | null;
  category: Category | null;
  tags: Tag[];
  author: Author | null;
  readingTime: number | null;
  seo: SEO | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Author {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  isPrimary: boolean | null;
  headline: string | null;
  bioShort: string;
  bioLong: BlocksContent | null;
  websiteUrl: string;
  linkedinUrl: string;
  sameAs: SocialLink[];
  profileImage: StrapiImage | null;
  jobTitle: string | null;
  worksForName: string | null;
  worksForUrl: string | null;
  alumniOf: string[] | null;
  knowsAbout: string[] | null;
  credentials: Credential[];
  addressLocality: string | null;
  addressRegion: string | null;
  addressCountry: string | null;
}

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
}

export interface Credential {
  id: number;
  name: string;
  issuer: string;
  icon: string | null;
}

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

// Contact Submission
export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  createdAt: string;
}

// Strapi Blocks Content type (used by blocks editor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BlocksContent = any[];
