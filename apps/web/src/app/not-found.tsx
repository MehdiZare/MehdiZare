import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center bg-paper px-6 py-24">
      <div className="text-center">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-accent-warm">
          404
        </p>
        <h1 className="mt-4 font-serif text-4xl text-ink sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-mid-gray">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="border border-ink bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-transparent hover:text-ink"
          >
            Go home
          </Link>
          <Link
            href="/blog"
            className="border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
          >
            Read the blog
          </Link>
          <Link
            href="/consulting"
            className="border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper"
          >
            Consulting
          </Link>
        </div>
      </div>
    </section>
  );
}
