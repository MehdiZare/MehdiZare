import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";

interface NewsletterCTAProps {
  headline: string;
  copy: string;
}

export function NewsletterCTA({ headline, copy }: NewsletterCTAProps) {
  return (
    <section className="bg-slate-100 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <BeehiivEmbed source="homepage_newsletter" title={headline} description={copy} />
      </div>
    </section>
  );
}
