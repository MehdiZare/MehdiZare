import type { Metadata } from "next";
import Link from "next/link";
import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";
import { CmsStructuredData } from "@/components/seo/CmsStructuredData";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildNewsletterFallback, normalizeBenefits } from "@/content/fallbacks";
import {
  buildBreadcrumbJsonLd,
  buildPageMetadata,
  buildWebPageJsonLd,
} from "@/lib/seo";
import { getSiteProfile } from "@/lib/site-profile";
import { getNewsletterPage } from "@/lib/strapi";

const newsletterMetadataTitle = "Newsletter";

export async function generateMetadata(): Promise<Metadata> {
  const siteProfile = await getSiteProfile();
  const newsletterKeywords = [
    "AI newsletter",
    "production AI insights",
    "LLM engineering",
    "AI strategy",
    "AI systems in production",
  ];

  try {
    const response = await getNewsletterPage();
    const cmsData = response.data;

    return buildPageMetadata({
      pathname: "/newsletter",
      title: newsletterMetadataTitle,
      description: cmsData?.subheadline || siteProfile.newsletterOneLiner,
      seo: cmsData?.seo,
      type: "website",
      keywords: newsletterKeywords,
    });
  } catch {
    return buildPageMetadata({
      pathname: "/newsletter",
      title: newsletterMetadataTitle,
      description: siteProfile.newsletterOneLiner,
      type: "website",
      keywords: newsletterKeywords,
    });
  }
}

export default async function NewsletterPage() {
  const siteProfile = await getSiteProfile();
  const fallbackData = buildNewsletterFallback(siteProfile);

  let data = fallbackData;
  let cmsStructuredData: unknown;

  try {
    const response = await getNewsletterPage();
    const cmsData = response.data;
    cmsStructuredData = cmsData?.seo?.structuredData;

    if (cmsData) {
      data = {
        headline: cmsData.headline || fallbackData.headline,
        subheadline: cmsData.subheadline || fallbackData.subheadline,
        socialProofText: cmsData.socialProofText || fallbackData.socialProofText,
        benefits: normalizeBenefits(cmsData.benefits, fallbackData.benefits),
        archiveLinks:
          cmsData.archiveLinks && cmsData.archiveLinks.length > 0
            ? cmsData.archiveLinks
            : fallbackData.archiveLinks,
      };
    }
  } catch {
    // Use fallback content when CMS is unavailable.
  }

  return (
    <div className="bg-paper pb-20">
      <CmsStructuredData
        idPrefix="newsletter-cms-jsonld"
        data={cmsStructuredData}
      />
      <JsonLd
        id="newsletter-webpage-jsonld"
        data={buildWebPageJsonLd({
          pathname: "/newsletter",
          title: data.headline,
          description: data.subheadline,
          type: "CollectionPage",
        })}
      />
      <JsonLd
        id="newsletter-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Newsletter", path: "/newsletter" },
        ])}
      />
      <section className="bg-ink py-20 text-paper">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-warm">Newsletter</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{data.headline}</h1>
          <p className="mt-5 text-lg text-white/60">{data.subheadline}</p>
          <p className="mt-4 text-sm text-white/40">{data.socialProofText}</p>
          <p className="mt-3 text-sm text-white/50">
            Need direct help shipping?{" "}
            <Link
              href="/consulting"
              className="text-accent-warm underline underline-offset-4 hover:text-white"
            >
              Explore consulting
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-6 lg:grid-cols-[1fr_1.4fr]">
          <article className="border border-warm-gray bg-paper p-6">
            <h2 className="font-serif text-xl text-ink">What you get</h2>
            <ul className="mt-5 space-y-3">
              {data.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-mid-gray">
                  <span className="mt-1 h-2 w-2 rounded-full bg-accent-warm" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <h3 className="mt-8 font-mono text-xs uppercase tracking-[0.2em] text-mid-gray">
              Past editions
            </h3>
            <ul className="mt-3 space-y-2">
              {data.archiveLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-sm text-accent-warm underline underline-offset-4 hover:text-ink">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <BeehiivEmbed
            source="newsletter_page"
            title="Subscribe now"
            description={siteProfile.newsletterOneLiner}
          />
        </div>
      </section>
    </div>
  );
}
