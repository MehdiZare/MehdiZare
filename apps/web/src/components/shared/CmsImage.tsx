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

function isBrokenImage(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth === 0;
}

function CmsImageInner({
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

  // Ref callback runs when the <img> mounts. If the request already finished
  // (and failed) before hydration, onError never fires — catch that here.
  const attachImage = (node: HTMLImageElement | null) => {
    if (node && isBrokenImage(node)) {
      setFailed(true);
    }
  };

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
      ref={attachImage}
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

export function CmsImage(props: CmsImageProps) {
  // Remount on src change so a prior failure does not stick across navigations.
  return <CmsImageInner key={props.src} {...props} />;
}
