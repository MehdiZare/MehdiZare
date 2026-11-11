/**
 * Reading time for an article, derived from its Strapi Blocks body.
 *
 * `readingTime` is a hand-entered integer in the CMS with nothing filling it
 * in, so a post published without it showed no "min read" and no BlogPosting
 * `timeRequired`. The CMS value stays an explicit override; the word count is
 * the fallback.
 *
 * Kept in a plain module, not `BlocksRenderer`, because that component is a
 * client module and server pages cannot call functions exported from it.
 */

/** Average adult silent-reading speed for non-fiction prose. */
export const WORDS_PER_MINUTE = 230;

interface BlockNode {
  type?: unknown;
  text?: unknown;
  children?: unknown;
}

function collectText(node: unknown, parts: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((child) => collectText(child, parts));
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  const block = node as BlockNode;
  if (typeof block.text === "string") {
    parts.push(block.text);
  }

  if (block.children !== undefined) {
    collectText(block.children, parts);
  }
}

/** Counts whitespace-separated words across every text leaf of a Blocks tree. */
export function countBlocksWords(content: unknown): number {
  const parts: string[] = [];
  collectText(content, parts);

  return parts
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * The CMS `readingTime` when it is a positive number, otherwise
 * `ceil(words / 230)` from the body. Returns `undefined` for an empty body so
 * callers render nothing rather than "0 min read".
 */
export function resolveReadingTimeMinutes(
  readingTime: number | null | undefined,
  content: unknown
): number | undefined {
  if (typeof readingTime === "number" && Number.isFinite(readingTime) && readingTime > 0) {
    return Math.round(readingTime);
  }

  const words = countBlocksWords(content);
  if (words === 0) {
    return undefined;
  }

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
