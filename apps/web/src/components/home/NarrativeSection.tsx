import { Label } from "@/components/shared/Label";

export function NarrativeSection() {
  return (
    <section id="the-problem" className="bg-paper py-24">
      <div className="mx-auto max-w-[680px] px-6">
        <Label>01 &mdash; The Problem</Label>

        <h2 className="mt-6 font-serif text-4xl font-bold leading-tight text-ink sm:text-5xl">
          Your AI demo worked. Your AI product didn&rsquo;t ship.
        </h2>

        <div className="mt-8 space-y-6 text-base leading-relaxed text-mid-gray">
          <p>
            The gap between a working prototype and a production system is where most AI
            projects go to die. It&rsquo;s not a model problem &mdash; it&rsquo;s an
            engineering problem compounded by a domain problem. The team that built the demo
            doesn&rsquo;t understand your industry&rsquo;s constraints. The team that
            understands the constraints can&rsquo;t architect the system.
          </p>
          <p>
            I bridge that gap. I&rsquo;m a principal-level AI engineer who has shipped
            production systems in{" "}
            <strong className="text-ink">finance, cybersecurity, healthcare, and defense</strong>
            . I earned a CFA Charter to understand capital markets. I hold a Secret
            clearance to work in national security.{" "}
            <strong className="text-ink">
              I learn your domain before I touch your codebase.
            </strong>
          </p>
        </div>
      </div>
    </section>
  );
}
