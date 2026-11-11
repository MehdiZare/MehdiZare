import type { Schema, Struct } from '@strapi/strapi';

export interface ArticleComparisonTable extends Struct.ComponentSchema {
  collectionName: 'components_article_comparison_tables';
  info: {
    description: 'Tabular comparison: columns is a JSON string array, rows a JSON array of string arrays';
    displayName: 'Comparison Table';
    icon: 'grid';
  };
  attributes: {
    caption: Schema.Attribute.String;
    columns: Schema.Attribute.JSON;
    notes: Schema.Attribute.Text;
    rows: Schema.Attribute.JSON;
  };
}

export interface ArticleKeyTakeaway extends Struct.ComponentSchema {
  collectionName: 'components_article_key_takeaways';
  info: {
    description: 'One answer-first takeaway rendered at the top of the post';
    displayName: 'Key Takeaway';
    icon: 'bulletList';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ArticleSource extends Struct.ComponentSchema {
  collectionName: 'components_article_sources';
  info: {
    description: "A cited source, rendered in the post's Sources list and as BlogPosting citation";
    displayName: 'Source';
    icon: 'link';
  };
  attributes: {
    accessedAt: Schema.Attribute.Date;
    publisher: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
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

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    description: 'A question and answer rendered visibly on the page';
    displayName: 'FAQ Item';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
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

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'article.comparison-table': ArticleComparisonTable;
      'article.key-takeaway': ArticleKeyTakeaway;
      'article.source': ArticleSource;
      'shared.credential': SharedCredential;
      'shared.faq-item': SharedFaqItem;
      'shared.seo': SharedSeo;
      'shared.social-link': SharedSocialLink;
    }
  }
}
