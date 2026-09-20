"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

function isBrokenImage(img: HTMLImageElement | null): boolean {
  return Boolean(img?.complete && img.naturalWidth === 0);
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
  const imgRef = useRef<HTMLImageElement | null>(null);

  // New src → try again (e.g. client navigation to another article).
  useEffect(() => {
    setFailed(false);
  }, [src]);

  // onError can miss failures that finish before hydration; catch those here.
  useEffect(() => {
    if (failed) return;
    if (isBrokenImage(imgRef.current)) {
      setFailed(true);
    }
  }, [src, failed]);

  if (failed) {
    const accessibleName = alt.trim();
    return (
      <div
        role={accessibleName ? "img" : undefined}
        aria-label={accessibleName || undefined}
        aria-hidden={accessibleName ? undefined : true}
        className={fill ? "absolute inset-0 h-full w-full" : undefined}
      >
        {fallback}
      </div>
    );
  }

  return (
    <Image
      ref={imgRef}
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
