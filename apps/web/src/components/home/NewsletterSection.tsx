import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";

interface NewsletterSectionProps {
  headline: string;
  copy: string;
}

export function NewsletterSection({ headline, copy }: NewsletterSectionProps) {
  return (
    <section className="border-t border-warm-gray bg-paper py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-mid-gray">
          06 &mdash; Stay Current
        </p>

        <h2 className="mt-6 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          {headline}
        </h2>

        <p className="mt-4 text-base text-mid-gray">{copy}</p>

        <div className="mt-10">
          <BeehiivEmbed source="homepage_newsletter" />
        </div>
      </div>
    </section>
  );
}
