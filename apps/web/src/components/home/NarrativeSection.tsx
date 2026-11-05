import { Label } from "@/components/shared/Label";

export function NarrativeSection() {
  return (
    <section id="the-problem" className="bg-paper py-24">
      <div className="mx-auto max-w-[680px] px-6">
        <Label>01. The problem</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Your AI demo worked. The workflow still eats the week.
        </h2>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-mid-gray">
          <p>
            A working prototype is not a system your team can leave running. The
            handoffs, the review, and the cost check are the work.
          </p>
          <p>
            I&apos;ve built AI and data systems at large companies, and now I build
            and run my own small products with AI agents. I help founders and small
            teams set up the same kind of system, remotely.
          </p>
        </div>
      </div>
    </section>
  );
}
