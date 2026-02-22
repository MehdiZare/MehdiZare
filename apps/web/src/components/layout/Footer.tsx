import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Bina Print", href: "/bina-print" },
  { label: "Blog", href: "/blog" },
  { label: "Consulting", href: "/consulting" },
  { label: "Newsletter", href: "/newsletter" },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://linkedin.com/in/mehdizare" },
  { label: "Medium", href: "https://medium.com/@mehdi-zare" },
  { label: "Seeking Alpha", href: "https://seekingalpha.com/author/mehdi-zare" },
  { label: "GitHub", href: "https://github.com/mehdizare" },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold">Mehdi Zare</h3>
            <p className="mt-1 text-sm font-medium text-teal-300">Mehdi Zare, CFA</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              AI That Thinks Like an Analyst. Helping financial institutions close the gap
              between AI ambition and production outcomes.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Site
            </h4>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Connect
            </h4>
            <ul className="mt-4 space-y-3">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-8">
          <p className="text-center text-sm text-slate-400">&copy; Mehdi Zare {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
}
