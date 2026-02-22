import Link from "next/link";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Consulting", href: "/consulting" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

const socialLinks = [
  { label: "LinkedIn", href: "https://linkedin.com/in/mehdizare" },
  { label: "Medium", href: "https://medium.com/@mehdizare" },
  { label: "GitHub", href: "https://github.com/mehdizare" },
  { label: "Seeking Alpha", href: "https://seekingalpha.com/author/mehdi-zare" },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Brand Column */}
          <div>
            <h3 className="text-lg font-bold">Mehdi Zare, CFA</h3>
            <p className="mt-1 text-sm font-medium text-teal-400">
              Principal AI Engineer
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Bridging artificial intelligence and finance to build intelligent
              systems that drive better decisions.
            </p>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Quick Links
            </h4>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social Links Column */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Connect
            </h4>
            <ul className="mt-4 space-y-3">
              {socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-center text-sm text-gray-500">
            &copy; 2026 Mehdi Zare. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
