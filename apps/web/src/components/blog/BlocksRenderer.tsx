"use client";

import {
  BlocksRenderer as StrapiBlocksRenderer,
  type BlocksContent,
} from "@strapi/blocks-react-renderer";
import Image from "next/image";
import { CodeBlock } from "./CodeBlock";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractText(children: unknown): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) {
    return children.map(extractText).join("");
  }
  if (
    children &&
    typeof children === "object" &&
    "props" in (children as Record<string, unknown>)
  ) {
    const el = children as { props?: { children?: unknown } };
    if (el.props?.children) {
      return extractText(el.props.children);
    }
  }
  return "";
}

interface BlocksRendererProps {
  content: BlocksContent | null | undefined;
}

export function BlocksRenderer({ content }: BlocksRendererProps) {
  if (!content || content.length === 0) {
    return null;
  }

  return (
    <div className="prose prose-gray max-w-none">
      <StrapiBlocksRenderer
        content={content}
        blocks={{
          paragraph: ({ children }) => (
            <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
          ),
          heading: ({ children, level }) => {
            const text = extractText(children);
            const id = slugify(text);
            const Tag = `h${level}` as keyof JSX.IntrinsicElements;
            const sizeClasses: Record<number, string> = {
              1: "text-4xl",
              2: "text-3xl",
              3: "text-2xl",
              4: "text-xl",
              5: "text-lg",
              6: "text-base",
            };
            return (
              <Tag
                id={id}
                className={`${sizeClasses[level] || "text-base"} font-bold text-gray-900 mb-4`}
              >
                {children}
              </Tag>
            );
          },
          list: ({ children, format }) => {
            if (format === "ordered") {
              return (
                <ol className="list-decimal ml-6 mb-4 text-gray-700 space-y-1">
                  {children}
                </ol>
              );
            }
            return (
              <ul className="list-disc ml-6 mb-4 text-gray-700 space-y-1">
                {children}
              </ul>
            );
          },
          quote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-gray-600 my-6">
              {children}
            </blockquote>
          ),
          code: ({ children }) => {
            const text = extractText(children);
            // Strapi blocks code block: plainText contains the code
            // Try to detect language from the first line or default to "text"
            const lines = text.split("\n");
            let language = "text";
            // Simple language detection heuristic
            if (lines[0]?.startsWith("```")) {
              language = lines[0].replace("```", "").trim() || "text";
              lines.shift();
              if (lines[lines.length - 1]?.trim() === "```") {
                lines.pop();
              }
            }
            return <CodeBlock code={lines.join("\n")} language={language} />;
          },
          image: ({ image }) => {
            const src = image.url.startsWith("/")
              ? `${process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337"}${image.url}`
              : image.url;
            return (
              <figure className="my-6">
                <Image
                  src={src}
                  alt={image.alternativeText || ""}
                  width={image.width}
                  height={image.height}
                  className="rounded-lg w-full h-auto"
                />
                {image.caption && (
                  <figcaption className="text-center text-sm text-gray-500 mt-2">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            );
          },
        }}
        modifiers={{
          bold: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          italic: ({ children }) => <em className="italic">{children}</em>,
          underline: ({ children }) => <u>{children}</u>,
          strikethrough: ({ children }) => <s>{children}</s>,
          code: ({ children }) => (
            <code className="bg-gray-100 text-sm font-mono px-1.5 py-0.5 rounded">
              {children}
            </code>
          ),
        }}
      />
    </div>
  );
}
