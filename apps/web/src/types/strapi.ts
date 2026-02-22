// Strapi generic response types

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

// Strapi media types

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

// SEO component

export interface SEO {
  id: number;
  metaTitle: string;
  metaDescription: string;
  canonicalURL?: string;
  metaImage?: StrapiImage;
  keywords?: string;
  metaRobots?: string;
  structuredData?: Record<string, unknown>;
  metaViewport?: string;
}

// Blocks content (Strapi rich text blocks)

export type BlocksContent = any[];

// Content types

export interface Category {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
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
  seo?: SEO;
  publishedDate?: string;
  readingTime?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// About page types

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
  icon?: string;
}

export interface Credential {
  id: number;
  title: string;
  issuer: string;
  date?: string;
  url?: string;
  description?: string;
  icon?: string;
}

export interface Experience {
  id: number;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  technologies?: string;
}

export interface Education {
  id: number;
  degree: string;
  institution: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  field?: string;
}

export interface AboutPage {
  id: number;
  documentId: string;
  title: string;
  subtitle?: string;
  bio: BlocksContent;
  profileImage?: StrapiImage;
  credentials?: Credential[];
  experiences?: Experience[];
  education?: Education[];
  socialLinks?: SocialLink[];
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Consulting page types

export interface ConsultingTier {
  id: number;
  name: string;
  description?: string;
  price?: string;
  priceUnit?: string;
  features?: string;
  highlighted?: boolean;
  ctaText?: string;
  ctaLink?: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface ConsultingPage {
  id: number;
  documentId: string;
  title: string;
  subtitle?: string;
  description?: BlocksContent;
  tiers?: ConsultingTier[];
  faqs?: FAQ[];
  calendlyUrl?: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Site settings types

export interface NavItem {
  id: number;
  label: string;
  href: string;
  order?: number;
  external?: boolean;
}

export interface SiteSettings {
  id: number;
  documentId: string;
  siteName: string;
  siteDescription?: string;
  logo?: StrapiImage;
  favicon?: StrapiImage;
  navItems?: NavItem[];
  footerText?: string;
  socialLinks?: SocialLink[];
  defaultSeo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Contact submission

export interface ContactSubmission {
  id?: number;
  documentId?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  phone?: string;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}
