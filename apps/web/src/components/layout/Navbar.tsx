"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

const navLinks = [
  { label: "About", href: "/about" },
  { label: "Writing", href: "/blog" },
  { label: "Bina Print", href: "/bina-print" },
];

const ctaHref = "/consulting#calendly";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-warm-gray/50 bg-paper/80 backdrop-blur-lg"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="font-mono text-sm font-medium tracking-wide text-ink">
          Mehdi Zare
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "text-sm transition-colors",
                    isActive ? "text-ink" : "text-mid-gray hover:text-ink"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block">
          <Link
            href={ctaHref}
            className="border border-ink px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
            onClick={() => {
              trackEvent("cta_work_with_me_clicked", {
                page: "global",
                section: "navbar",
                cta_label: "Work With Me",
              });
            }}
          >
            Work With Me
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-mid-gray transition-colors hover:text-ink md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="border-t border-warm-gray/50 bg-paper/95 backdrop-blur-lg md:hidden">
          <ul className="space-y-1 px-6 py-4">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block px-3 py-2 text-sm transition-colors",
                      isActive ? "text-ink" : "text-mid-gray hover:text-ink"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2">
              <Link
                href={ctaHref}
                onClick={() => {
                  setMobileMenuOpen(false);
                  trackEvent("cta_work_with_me_clicked", {
                    page: "global",
                    section: "navbar_mobile",
                    cta_label: "Work With Me",
                  });
                }}
                className="block border border-ink px-3 py-2 text-center text-sm font-medium text-ink"
              >
                Work With Me
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
