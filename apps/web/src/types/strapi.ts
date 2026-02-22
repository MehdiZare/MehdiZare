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

// Home page

export interface HomeCredibilityItem {
  id: number;
  organization: string;
  detail?: string;
  url?: string;
}

export interface HomeFeaturedOnItem {
  id: number;
  platform: string;
  url?: string;
}

export interface HomeValueCard {
  id: number;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface HomePage {
  id: number;
  documentId: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroPrimaryCtaLabel?: string;
  heroPrimaryCtaHref?: string;
  heroSecondaryCtaLabel?: string;
  heroSecondaryCtaHref?: string;
  heroImage?: StrapiImage;
  credibilityItems?: HomeCredibilityItem[];
  featuredOnItems?: HomeFeaturedOnItem[];
  whatIDoCards?: HomeValueCard[];
  newsletterHeadline?: string;
  newsletterCopy?: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// About page

export interface AboutPage {
  id: number;
  documentId: string;
  title?: string;
  positioningStatement?: string;
  bio?: BlocksContent;
  stats?: StatItem[];
  credentials?: Credential[];
  experiences?: Experience[];
  education?: Education[];
  socialLinks?: SocialLink[];
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Bina Print page

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

export interface BinaPrintPage {
  id: number;
  documentId: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  searchPlaceholder?: string;
  howItWorks?: BinaStep[];
  topMovers?: BinaMover[];
  exampleTicker?: string;
  exampleOverallScore?: number;
  exampleSubScores?: Record<string, number>;
  methodologySummary?: string;
  emailGateHeadline?: string;
  emailGateCopy?: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Consulting page

export interface ConsultingTier {
  id: number;
  name: string;
  priceRange: string;
  hoursPerMonth?: string;
  scope?: string;
  features?: string[];
  ctaText?: string;
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

export interface ConsultingPage {
  id: number;
  documentId: string;
  title?: string;
  subtitle?: string;
  audiences?: ConsultingAudience[];
  tiers?: ConsultingTier[];
  faq?: FAQ[];
  calendlyUrl?: string;
  leadMagnetTitle?: string;
  leadMagnetDescription?: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Newsletter page

export interface NewsletterPage {
  id: number;
  documentId: string;
  headline?: string;
  subheadline?: string;
  benefits?: string[];
  archiveLinks?: NavItem[];
  signupCtaLabel?: string;
  socialProofText?: string;
  seo?: SEO;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Site settings

export interface SiteSettings {
  id: number;
  documentId: string;
  siteName?: string;
  siteDescription?: string;
  footerText?: string;
  bookCallHref?: string;
  navItems?: NavItem[];
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
