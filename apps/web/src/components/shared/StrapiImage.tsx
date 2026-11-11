import type { ReactNode } from "react";
import type { StrapiImage as StrapiImageType } from "@/types/strapi";
import { CmsImage } from "@/components/shared/CmsImage";
import { cn } from "@/lib/utils";
import { toAbsoluteStrapiMediaUrl } from "@/lib/public-env";
import { blankToUndefined } from "@/lib/strings";

interface StrapiImageProps {
  image: StrapiImageType | null | undefined;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  /**
   * `next/image` sizes. Without it a `fill` image is served at 100vw, so a hero
   * in an 8/12 column downloads roughly twice the pixels it shows.
   */
  sizes?: string;
  /**
   * Alt text when the CMS media has no `alternativeText`. A blank alt marks the
   * image decorative, which hides covers from Google Images and screen readers.
   */
  fallbackAlt?: string;
  /** Rendered when the image is missing or fails to load; defaults to a muted monogram tile. */
  fallback?: ReactNode;
}

function getStrapiImageUrl(url: string): string {
  return toAbsoluteStrapiMediaUrl(url);
}

function DefaultFallback({ fill, width, height }: { fill: boolean; width?: number; height?: number }) {
  if (fill) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <span className="font-serif text-4xl text-ink/10">MZ</span>
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-center justify-center bg-muted"
      style={{ aspectRatio: `${width ?? 16} / ${height ?? 9}` }}
    >
      <span className="font-serif text-4xl text-ink/10">MZ</span>
    </div>
  );
}

export function StrapiImage({
  image,
  className,
  fill,
  width,
  height,
  priority = false,
  sizes,
  fallbackAlt,
  fallback,
}: StrapiImageProps) {
  const resolvedWidth = width ?? image?.width;
  const resolvedHeight = height ?? image?.height;
  const resolvedFallback =
    fallback ?? (
      <DefaultFallback fill={Boolean(fill)} width={resolvedWidth} height={resolvedHeight} />
    );

  if (!image?.url) {
    return <>{resolvedFallback}</>;
  }

  const src = getStrapiImageUrl(image.url);
  const alt = blankToUndefined(image.alternativeText) ?? blankToUndefined(fallbackAlt) ?? "";

  return (
    <CmsImage
      src={src}
      alt={alt}
      fill={fill}
      width={resolvedWidth}
      height={resolvedHeight}
      priority={priority}
      sizes={sizes}
      className={fill ? cn("object-cover", className) : className}
      fallback={resolvedFallback}
    />
  );
}
