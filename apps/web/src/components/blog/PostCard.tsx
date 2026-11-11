import Link from "next/link";
import type { Article } from "@/types/strapi";
import { CmsImage } from "@/components/shared/CmsImage";
import { toAbsoluteStrapiMediaUrl } from "@/lib/public-env";
import { resolveReadingTimeMinutes } from "@/lib/reading-time";
import { resolveFeaturedImageAlt } from "@/lib/article-content";

/**
 * Matches the listing grid (`md:grid-cols-2 lg:grid-cols-3` in `max-w-7xl`):
 * one column on phones, two on tablets, three (~400px) on desktop. The old
 * `(max-width: 768px) 100vw, 33vw` served tablets a third-width image for a
 * half-width slot.
 */
const POST_CARD_IMAGE_SIZES =
  "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";

function getStrapiImageUrl(url: string): string {
  return toAbsoluteStrapiMediaUrl(url);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface PostCardProps {
  article: Article;
}

function CoverFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <span className="font-serif text-4xl text-ink/10">MZ</span>
    </div>
  );
}

export function PostCard({ article }: PostCardProps) {
  const imageUrl = article.featuredImage?.url
    ? getStrapiImageUrl(article.featuredImage.url)
    : null;

  const displayDate = article.publishedDate || article.publishedAt;
  const categoryName = article.category?.name;
  const readingTimeMinutes = resolveReadingTimeMinutes(article.readingTime, article.content);

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block overflow-hidden border border-warm-gray bg-paper transition-colors hover:border-mid-gray"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {imageUrl ? (
          <CmsImage
            src={imageUrl}
            alt={resolveFeaturedImageAlt(article)}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={POST_CARD_IMAGE_SIZES}
            fallback={<CoverFallback />}
          />
        ) : (
          <CoverFallback />
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {categoryName && (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-accent-warm">
            {categoryName}
          </span>
        )}

        <h3 className="mt-2 line-clamp-2 font-serif text-lg text-ink">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm text-mid-gray">
            {article.excerpt}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3 font-mono text-xs text-mid-gray/60">
          {displayDate && <time dateTime={displayDate}>{formatDate(displayDate)}</time>}
          {readingTimeMinutes && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{readingTimeMinutes} min read</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
