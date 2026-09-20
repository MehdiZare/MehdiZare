"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

interface CmsImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /**
   * Rendered instead of the image when it fails to load (e.g. the CMS file is
   * missing). Server-rendered markup is unaffected; the swap is client-side.
   */
  fallback: ReactNode;
}

export function CmsImage({
  src,
  alt,
  fill = false,
  width,
  height,
  priority = false,
  sizes,
  className,
  fallback,
}: CmsImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      {...(fill ? { fill: true } : { width: width ?? 1, height: height ?? 1 })}
      priority={priority}
      sizes={sizes}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
