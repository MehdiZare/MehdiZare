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
 *
 * That applies to `degree` and `institution` too, even though both are
 * `required` in the Strapi component: `required` rejects `""` but accepts
 * `"   "`, which is the same reachability argument #89 makes for `description`.
 * The heading is joined from the parts that survive, so a blank `degree` cannot
 * leave a leading separator either.
 */
export function EducationList({ education }: EducationListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {education.map((edu) => {
        const degree = blankToUndefined(edu.degree);
        const field = blankToUndefined(edu.field);
        const institution = blankToUndefined(edu.institution);
        const description = blankToUndefined(edu.description);
        const heading = [degree, field].filter(Boolean).join(", ");

        return (
          <article key={edu.id} className="border border-warm-gray bg-paper p-6">
            {heading ? (
              <h3 className="font-medium text-ink">{heading}</h3>
            ) : null}
            {institution ? (
              <p className="mt-1 text-sm text-accent-warm">{institution}</p>
            ) : null}
            {description ? (
              <p className="mt-3 text-sm text-mid-gray">{description}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
