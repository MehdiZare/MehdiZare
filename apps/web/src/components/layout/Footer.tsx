const socialLinks = [
  { label: "LinkedIn", href: "https://linkedin.com/in/mehdizare" },
  { label: "GitHub", href: "https://github.com/mehdizare" },
  { label: "Medium", href: "https://medium.com/@mehdi-zare" },
  { label: "Seeking Alpha", href: "https://seekingalpha.com/author/mehdi-zare" },
];

export function Footer() {
  return (
    <footer className="border-t border-warm-gray bg-paper">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-12 sm:flex-row sm:items-center lg:px-8">
        <div>
          <p className="font-mono text-sm font-medium text-ink">Mehdi Zare, CFA</p>
          <p className="mt-1 text-sm text-mid-gray">
            Principal AI Engineer &middot; Arlington, VA
          </p>
        </div>

        <div className="flex flex-wrap gap-6">
          {socialLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-mid-gray transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-warm-gray">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
          <p className="text-xs text-mid-gray">
            &copy; Mehdi Zare {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
