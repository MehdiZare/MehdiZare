"use client";

import { useEffect, useState, useMemo } from "react";
import type { BlocksContent } from "@/types/strapi";
import { cn } from "@/lib/utils";

interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractTextFromBlock(block: {
  children?: unknown;
  type?: unknown;
  text?: unknown;
}): string {
  if (!block) return "";
  const children = block.children as Array<{
    children?: unknown;
    type?: unknown;
    text?: unknown;
  }> | undefined;
  if (!children || !Array.isArray(children)) return "";
  return children
    .map((child) => {
      if (child.type === "text" && typeof child.text === "string") {
        return child.text;
      }
      if (child.children) {
        return extractTextFromBlock(child);
      }
      return "";
    })
    .join("");
}

function extractHeadings(content: BlocksContent | null | undefined): TocHeading[] {
  if (!content) return [];

  const headings: TocHeading[] = [];

  for (const block of content) {
    if (
      block.type === "heading" &&
      (block.level === 2 || block.level === 3)
    ) {
      const text = extractTextFromBlock(block);
      if (text) {
        headings.push({
          id: slugify(text),
          text,
          level: block.level as 2 | 3,
        });
      }
    }
  }

  return headings;
}

interface TableOfContentsProps {
  content: BlocksContent | null | undefined;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is currently intersecting
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      }
    );

    const headingElements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter(Boolean) as HTMLElement[];

    headingElements.forEach((el) => observer.observe(el));

    return () => {
      headingElements.forEach((el) => observer.unobserve(el));
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-24">
      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Table of Contents
      </h4>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cn(
                "block text-sm py-1 transition-colors",
                heading.level === 3 && "pl-4",
                activeId === heading.id
                  ? "text-primary font-medium"
                  : heading.level === 2
                    ? "text-gray-600 hover:text-primary"
                    : "text-gray-400 hover:text-primary"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
