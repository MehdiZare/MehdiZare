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
  readingTime: number | null;
  seo: SEO | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
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

// About Page (Single Type)
export interface Credential {
  id: number;
  name: string;
  issuer: string;
  icon: string | null;
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  period: string;
  description: string | null;
}

export interface Education {
  id: number;
  degree: string;
  institution: string;
  year: string;
}

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

export interface AboutPage {
  title: string;
  positioningStatement: string | null;
  bio: BlocksContent;
  credentials: Credential[];
  experience: Experience[];
  education: Education[];
  socialLinks: SocialLink[];
}

// Consulting Page (Single Type)
export interface ConsultingTier {
  id: number;
  name: string;
  priceRange: string;
  hoursPerMonth: string;
  scope: string;
  features: string[];
  ctaText: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ConsultingPage {
  headline: string;
  intro: string | null;
  tiers: ConsultingTier[];
  calendlyUrl: string | null;
  faq: FAQ[];
}

// Site Settings (Single Type)
export interface NavItem {
  id: number;
  label: string;
  href: string;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string | null;
  socialLinks: SocialLink[];
  navItems: NavItem[];
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
