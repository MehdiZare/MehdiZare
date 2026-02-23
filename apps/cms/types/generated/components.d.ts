import type { Schema, Struct } from '@strapi/strapi';

export interface BinaMover extends Struct.ComponentSchema {
  collectionName: 'components_bina_movers';
  info: {
    description: 'Weekly Bina score mover';
    displayName: 'Top Mover';
    icon: 'arrowUp';
  };
  attributes: {
    analysisUrl: Schema.Attribute.String;
    company: Schema.Attribute.String & Schema.Attribute.Required;
    score: Schema.Attribute.Decimal;
    scoreChange: Schema.Attribute.Decimal;
    ticker: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface BinaStep extends Struct.ComponentSchema {
  collectionName: 'components_bina_steps';
  info: {
    description: 'How Bina Print works';
    displayName: 'Bina Step';
    icon: 'walk';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ConsultingAudience extends Struct.ComponentSchema {
  collectionName: 'components_consulting_audiences';
  info: {
    description: 'Ideal consulting audience';
    displayName: 'Audience';
    icon: 'users';
  };
  attributes: {
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ConsultingFaq extends Struct.ComponentSchema {
  collectionName: 'components_consulting_faqs';
  info: {
    description: 'Frequently asked question';
    displayName: 'FAQ';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ConsultingTier extends Struct.ComponentSchema {
  collectionName: 'components_consulting_tiers';
  info: {
    description: 'Consulting service tier';
    displayName: 'Tier';
    icon: 'star';
  };
  attributes: {
    ctaText: Schema.Attribute.String;
    features: Schema.Attribute.JSON;
    hoursPerMonth: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    priceRange: Schema.Attribute.String & Schema.Attribute.Required;
    scope: Schema.Attribute.Text;
  };
}

export interface HomeCredibilityItem extends Struct.ComponentSchema {
  collectionName: 'components_home_credibility_items';
  info: {
    description: 'Credential, employer, or trust marker';
    displayName: 'Credibility Item';
    icon: 'shield';
  };
  attributes: {
    detail: Schema.Attribute.String;
    organization: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface HomeFeaturedOnItem extends Struct.ComponentSchema {
  collectionName: 'components_home_featured_on_items';
  info: {
    description: 'External publication or platform';
    displayName: 'Featured On Item';
    icon: 'star';
  };
  attributes: {
    platform: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface HomeValueCard extends Struct.ComponentSchema {
  collectionName: 'components_home_value_cards';
  info: {
    description: 'What I do card';
    displayName: 'Value Card';
    icon: 'apps';
  };
  attributes: {
    ctaHref: Schema.Attribute.String;
    ctaLabel: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedCredential extends Struct.ComponentSchema {
  collectionName: 'components_shared_credentials';
  info: {
    description: 'Professional credential or certification';
    displayName: 'Credential';
    icon: 'certificate';
  };
  attributes: {
    description: Schema.Attribute.Text;
    issuer: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
  };
}

export interface SharedEducation extends Struct.ComponentSchema {
  collectionName: 'components_shared_educations';
  info: {
    description: 'Education entry';
    displayName: 'Education';
    icon: 'graduation-cap';
  };
  attributes: {
    degree: Schema.Attribute.String & Schema.Attribute.Required;
    description: Schema.Attribute.Text;
    field: Schema.Attribute.String;
    institution: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedExperience extends Struct.ComponentSchema {
  collectionName: 'components_shared_experiences';
  info: {
    description: 'Work experience entry';
    displayName: 'Experience';
    icon: 'briefcase';
  };
  attributes: {
    company: Schema.Attribute.String & Schema.Attribute.Required;
    current: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    description: Schema.Attribute.Text;
    endDate: Schema.Attribute.String;
    startDate: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedNavItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_nav_items';
  info: {
    description: 'Navigation menu item';
    displayName: 'Nav Item';
    icon: 'layer';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: 'SEO metadata for pages and articles';
    displayName: 'SEO';
    icon: 'search';
  };
  attributes: {
    canonicalURL: Schema.Attribute.String;
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
    metaImage: Schema.Attribute.Media<'images'>;
    metaRobots: Schema.Attribute.String;
    metaTitle: Schema.Attribute.String;
    structuredData: Schema.Attribute.JSON;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: 'components_shared_social_links';
  info: {
    description: 'Social media or external link';
    displayName: 'Social Link';
    icon: 'link';
  };
  attributes: {
    platform: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStat extends Struct.ComponentSchema {
  collectionName: 'components_shared_stats';
  info: {
    description: 'Short proof-point metric';
    displayName: 'Stat';
    icon: 'chartBar';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'bina.mover': BinaMover;
      'bina.step': BinaStep;
      'consulting.audience': ConsultingAudience;
      'consulting.faq': ConsultingFaq;
      'consulting.tier': ConsultingTier;
      'home.credibility-item': HomeCredibilityItem;
      'home.featured-on-item': HomeFeaturedOnItem;
      'home.value-card': HomeValueCard;
      'shared.credential': SharedCredential;
      'shared.education': SharedEducation;
      'shared.experience': SharedExperience;
      'shared.nav-item': SharedNavItem;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
      'shared.stat': SharedStat;
    }
  }
}
