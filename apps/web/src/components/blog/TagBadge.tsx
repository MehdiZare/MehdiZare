import Link from "next/link";
import type { Tag } from "@/types/strapi";

interface TagBadgeProps {
  tag: Tag;
}

export function TagBadge({ tag }: TagBadgeProps) {
  return (
    <Link
      href={`/blog?tag=${tag.slug}`}
      className="inline-block text-xs font-medium text-teal-700 bg-teal-50 rounded-full px-2.5 py-0.5 transition hover:bg-teal-100"
    >
      {tag.name}
    </Link>
  );
}
