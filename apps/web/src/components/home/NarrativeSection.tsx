import { Label } from "@/components/shared/Label";

export function NarrativeSection() {
  return (
    <section id="the-problem" className="bg-paper py-24">
      <div className="mx-auto max-w-[680px] px-6">
        <Label>01. The problem</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Your AI demo worked. Production is a different system.
        </h2>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-mid-gray">
          <p>
            A working prototype is not a product customers can rely on. Jobs fail
            halfway, models change, costs drift, and nobody owns the data path.
            Retries, approval steps, evaluation and a cost check are the work.
          </p>
          <p>
            I&apos;ve built AI and data systems at large companies, and now I build
            and run my own products with AI coding agents. I help founders and
            CTOs take theirs from prototype to production, remotely.
          </p>
        </div>
      </div>
    </section>
  );
}
