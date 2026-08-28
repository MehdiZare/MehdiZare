// Generic Strapi response types

export interface StrapiMeta {
  pagination?: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

export interface StrapiResponse<T> {
  data: T;
  meta: StrapiMeta;
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta: StrapiMeta;
}

// Media

export interface StrapiImageFormat {
  url: string;
  width: number;
  height: number;
  size: number;
  name: string;
  hash: string;
  ext: string;
  mime: string;
}

export interface StrapiImage {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  } | null;
  name: string;
  hash: string;
  ext: string;
  mime: string;
  size: number;
}

// SEO

export interface SEO {
  id: number;
  metaTitle?: string;
  metaDescription?: string;
  canonicalURL?: string;
  keywords?: string;
  metaRobots?: string;
  metaImage?: StrapiImage;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

// Rich text blocks

export type BlocksContent = import("@strapi/blocks-react-renderer").BlocksContent;

// Blog

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  parent?: Category | null;
  children?: Category[];
  order?: number;
  headline?: string;
  intro?: string;
  seo?: SEO;
  articles?: Article[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  headline?: string;
  intro?: string;
  seo?: SEO;
  articles?: Article[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Author {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  isPrimary?: boolean;
  headline?: string;
  bioShort: string;
  bioLong?: BlocksContent;
  websiteUrl: string;
  linkedinUrl: string;
  sameAs?: SocialLink[];
  profileImage?: StrapiImage;
  jobTitle?: string;
  worksForName?: string;
  worksForUrl?: string;
  alumniOf?: string[];
  knowsAbout?: string[];
  credentials?: Credential[];
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  articles?: Article[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: BlocksContent;
  featuredImage?: StrapiImage;
  category?: Category;
  tags?: Tag[];
  author?: Author;
  seo?: SEO;
  publishedDate?: string;
  readingTime?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Shared content blocks

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

export interface Credential {
  id: number;
  title: string;
  issuer?: string;
  description?: string;
  url?: string;
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface Education {
  id: number;
  degree: string;
  field?: string;
  institution: string;
  description?: string;
}

export interface StatItem {
  id: number;
  value: string;
  label: string;
}

export interface NavItem {
  id: number;
  label: string;
  href: string;
  order?: number;
  external?: boolean;
}

// Bina Print (repo-owned page copy; these shapes are the fallback types)

export interface BinaStep {
  id: number;
  title: string;
  description: string;
}

export interface BinaMover {
  id: number;
  ticker: string;
  company: string;
  score?: number;
  scoreChange?: number;
  analysisUrl?: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ConsultingAudience {
  id: number;
  title: string;
  description: string;
}

// Contact submission

export interface ContactSubmission {
  id?: number;
  documentId?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}

export type ContactSubmissionInput = Pick<
  ContactSubmission,
  "name" | "email" | "subject" | "message"
>;
