import { BeehiivEmbed } from "@/components/newsletter/BeehiivEmbed";
import { Label } from "@/components/shared/Label";

interface NewsletterSectionProps {
  headline: string;
  copy: string;
}

export function NewsletterSection({ headline, copy }: NewsletterSectionProps) {
  return (
    <section id="newsletter" className="border-t border-warm-gray bg-paper py-24">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <Label>06 &mdash; Stay Current</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          {headline}
        </h2>

        <p className="mt-4 text-sm font-medium text-accent-warm">
          Join 500+ AI engineers and leaders
        </p>

        <p className="mt-3 text-base text-mid-gray">{copy}</p>

        <div className="mt-10">
          <BeehiivEmbed source="homepage_newsletter" />
        </div>
      </div>
    </section>
  );
}
