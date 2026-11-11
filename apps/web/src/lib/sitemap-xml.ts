import type { MetadataRoute } from "next";

/**
 * Sitemap XML for `MetadataRoute.Sitemap` entries, in the same shape Next's own
 * metadata route writes (`resolveSitemap` in next/dist/build/webpack/loaders/
 * metadata/resolve-route-data.js): the urlset namespaces, then per URL the
 * loc, hreflang alternates, images, lastmod, changefreq and priority.
 *
 * Two deliberate differences: text and attribute values are XML-escaped (Next
 * writes them raw, so a `&` in a URL produces an unparseable sitemap), and
 * video entries are not supported because this site emits none -- an entry
 * with videos throws rather than silently dropping them.
 */
export function serializeSitemap(entries: MetadataRoute.Sitemap): string {
  const hasAlternates = entries.some((entry) => Object.keys(entry.alternates?.languages ?? {}).length > 0);
  const hasImages = entries.some((entry) => Boolean(entry.images?.length));
  if (entries.some((entry) => Boolean(entry.videos?.length))) {
    throw new Error("serializeSitemap: video entries are not supported");
  }

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  if (hasImages) xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  xml += hasAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' : ">\n";

  for (const entry of entries) {
    xml += "<url>\n";
    xml += `<loc>${escapeXml(entry.url)}</loc>\n`;
    const languages = entry.alternates?.languages;
    if (languages) {
      for (const [language, href] of Object.entries(languages)) {
        if (!href) continue;
        xml += `<xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(String(href))}" />\n`;
      }
    }
    for (const image of entry.images ?? []) {
      xml += `<image:image>\n<image:loc>${escapeXml(image)}</image:loc>\n</image:image>\n`;
    }
    if (entry.lastModified) {
      const lastmod = entry.lastModified instanceof Date ? entry.lastModified.toISOString() : entry.lastModified;
      xml += `<lastmod>${escapeXml(lastmod)}</lastmod>\n`;
    }
    if (entry.changeFrequency) xml += `<changefreq>${entry.changeFrequency}</changefreq>\n`;
    if (typeof entry.priority === "number") xml += `<priority>${entry.priority}</priority>\n`;
    xml += "</url>\n";
  }

  return `${xml}</urlset>\n`;
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/** Escapes the five XML special characters for text and attribute values. */
function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}
