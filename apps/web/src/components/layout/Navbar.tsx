"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { captureEvent } from "@/lib/analytics";
import type { NavItem } from "@/types/strapi";

const isContactHref = (href: string): boolean => /^\/contact(?:\/|\?|#|$)/.test(href);

interface NavbarProps {
  siteName: string;
  navLinks: NavItem[];
  ctaLabel: string;
  ctaHref: string;
}

export function Navbar({ siteName, navLinks, ctaLabel, ctaHref }: NavbarProps) {
  const pathname = usePathname();
  const [openMenuForPath, setOpenMenuForPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuOpen = openMenuForPath === pathname;
  const mobileMenuId = "mobile-navigation-menu";

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
          {siteName}
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isExternal = Boolean(link.external) || link.href.startsWith("http");
            const isActive =
              !isExternal && (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href));

            return (
              <li key={`${link.id}-${link.href}`}>
                {isExternal ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative text-sm text-mid-gray transition-colors hover:text-ink"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    onClick={() => {
                      if (isContactHref(link.href)) {
                        captureEvent("funnel_contact_intent", {
                          section: "navbar_links",
                          cta_label: link.label,
                          destination: link.href,
                          interaction_type: "link_click",
                        });
                      }
                    }}
                    className={cn(
                      "relative text-sm transition-colors",
                      isActive
                        ? "text-ink after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:bg-ink"
                        : "text-mid-gray hover:text-ink"
                    )}
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="hidden md:block">
          <Link
            href={ctaHref}
            className="rounded-sm border border-ink px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
            onClick={() => {
              captureEvent("funnel_cta_click", {
                section: "navbar",
                cta_label: ctaLabel,
                destination: ctaHref,
                interaction_type: "link_click",
              });
            }}
          >
            {ctaLabel}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-mid-gray transition-colors hover:text-ink md:hidden"
          onClick={() => {
            setOpenMenuForPath((current) => (current === pathname ? null : pathname));
          }}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
          aria-controls={mobileMenuId}
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

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            id={mobileMenuId}
            className="overflow-hidden border-t border-warm-gray/50 bg-paper/95 backdrop-blur-lg md:hidden"
          >
            <ul className="space-y-1 px-6 py-4">
              {navLinks.map((link) => {
                const isExternal = Boolean(link.external) || link.href.startsWith("http");
                const isActive =
                  !isExternal &&
                  (link.href === "/" ? pathname === "/" : pathname.startsWith(link.href));

                return (
                  <li key={`${link.id}-${link.href}`}>
                    {isExternal ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpenMenuForPath(null)}
                        className="block px-3 py-2 text-sm text-mid-gray transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => {
                          setOpenMenuForPath(null);
                          if (isContactHref(link.href)) {
                            captureEvent("funnel_contact_intent", {
                              section: "navbar_mobile_links",
                              cta_label: link.label,
                              destination: link.href,
                              interaction_type: "link_click",
                            });
                          }
                        }}
                        className={cn(
                          "block px-3 py-2 text-sm transition-colors",
                          isActive ? "text-ink" : "text-mid-gray hover:text-ink"
                        )}
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                );
              })}
              <li className="pt-2">
                <Link
                  href={ctaHref}
                  onClick={() => {
                    setOpenMenuForPath(null);
                    captureEvent("funnel_cta_click", {
                      section: "navbar_mobile",
                      cta_label: ctaLabel,
                      destination: ctaHref,
                      interaction_type: "link_click",
                    });
                  }}
                  className="block rounded-sm border border-ink px-3 py-2 text-center text-sm font-medium text-ink"
                >
                  {ctaLabel}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
