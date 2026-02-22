import Image from "next/image";
import type { StrapiImage as StrapiImageType } from "@/types/strapi";
import { cn } from "@/lib/utils";
import { toAbsoluteStrapiMediaUrl } from "@/lib/public-env";

interface StrapiImageProps {
  image: StrapiImageType | null | undefined;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
}

function getStrapiImageUrl(url: string): string {
  return toAbsoluteStrapiMediaUrl(url);
}

export function StrapiImage({
  image,
  className,
  fill,
  width,
  height,
  priority = false,
}: StrapiImageProps) {
  if (!image) {
    return null;
  }

  const src = getStrapiImageUrl(image.url);
  const alt = image.alternativeText ?? "";

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? image.width}
      height={height ?? image.height}
      priority={priority}
      className={cn(className)}
    />
  );
}
