import Link from "next/link";
import type { Tag } from "@/types/strapi";

interface TagBadgeProps {
  tag: Tag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link
      href={`/blog/tag/${tag.slug}`}
      className="inline-block font-mono text-xs text-accent-warm bg-accent-warm/10 px-2.5 py-0.5 transition hover:bg-accent-warm/20"
    >
      {tag.name}
    </Link>
  );
}
