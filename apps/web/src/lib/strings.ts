/**
 * The single definition of "blank" for CMS-sourced copy.
 *
 * Strapi returns `""` for a field a content editor cleared and `"   "` for one
 * they left a space in. Both are *present* to `??` and truthy to `{value && …}`,
 * so without this rule a cleared field wins over its fallback and a
 * whitespace-only field renders an empty element. Every fix in this class
 * (#75, #77, #79, #80, #83, #89) is an application of the same rule, which is
 * why it lives in one module rather than being restated per surface.
 *
 * `unknown` rather than `string | null | undefined`: Strapi `json` attributes
 * and loosely-typed API responses can put a number or an object in a slot the
 * types call a string, and a caller wants `undefined` there, not `"0"`.
 */
export function blankToUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Picks the first candidate that is not blank, trimmed, or `undefined` if none
 * is. The replacement for `a ?? b ?? c` wherever the values come from the CMS:
 * candidate order is preserved, so callers pass the CMS value first and the
 * Site Profile fallback last.
 */
export function firstFilled(...values: unknown[]): string | undefined {
  for (const value of values) {
    const filled = blankToUndefined(value);
    if (filled !== undefined) {
      return filled;
    }
  }

  return undefined;
}

/**
 * Title-cases a slug for use as a last-resort display label: `agent-frameworks`
 * becomes `Agent Frameworks`. Lives here rather than in `blog-listing.ts`
 * because it is a pure string rule with no taxonomy or CMS dependency, and
 * `blog-listing.ts` pulls in the Strapi client (and with it `server-only`).
 */
export function formatSlugName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
