import { blankToUndefined } from "@/lib/strings";
import type { Education } from "@/types/strapi";

interface EducationListProps {
  education: Education[];
}

/**
 * The education grid on /about. Extracted from the page so its rendered output
 * can be asserted directly (#89) rather than grepped for a guard shape.
 *
 * Every CMS string goes through `blankToUndefined`: a field a content editor
 * left with a space is truthy, so guarding on the raw value renders an empty
 * paragraph, and a whitespace-only `field` renders a dangling `MBA, ` heading.
 */
export function EducationList({ education }: EducationListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {education.map((edu) => {
        const field = blankToUndefined(edu.field);
        const description = blankToUndefined(edu.description);

        return (
          <article key={edu.id} className="border border-warm-gray bg-paper p-6">
            <h3 className="font-medium text-ink">
              {edu.degree}
              {field ? `, ${field}` : ""}
            </h3>
            <p className="mt-1 text-sm text-accent-warm">{edu.institution}</p>
            {description ? (
              <p className="mt-3 text-sm text-mid-gray">{description}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
