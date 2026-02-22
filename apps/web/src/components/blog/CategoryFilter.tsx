"use client";

import Link from "next/link";
import type { Category } from "@/types/strapi";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: Category[];
  activeSlug: string | null;
}

export function CategoryFilter({ categories, activeSlug }: CategoryFilterProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2">
        <Link
          href="/blog"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap",
            activeSlug === null
              ? "bg-primary text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/blog?category=${category.slug}`}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap",
              activeSlug === category.slug
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {category.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
