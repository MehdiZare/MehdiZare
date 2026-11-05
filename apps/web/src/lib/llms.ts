import { getSiteUrl } from "./seo";

function buildAbsolutePath(path: string, siteUrl: string): string {
  return new URL(path, siteUrl).toString();
}

export function buildLlmsTxtContent(): string {
  const siteUrl = getSiteUrl();
  const lines = [
    "# llms.txt - mehdi-zare.com",
    "",
    "name: Mehdi Zare",
    "description: Founder and AI consultant, and CFA Charterholder. Builds and runs small products with AI agents, and helps founders and small teams do the same, remotely.",
    `canonical_host: ${siteUrl}`,
    `sitemap: ${buildAbsolutePath("/sitemap.xml", siteUrl)}`,
    "",
    "preferred_urls:",
    `- ${siteUrl}`,
    `- ${buildAbsolutePath("/about", siteUrl)}`,
    `- ${buildAbsolutePath("/consulting", siteUrl)}`,
    `- ${buildAbsolutePath("/ai-engineer", siteUrl)}`,
    `- ${buildAbsolutePath("/blog", siteUrl)}`,
    `- ${buildAbsolutePath("/author/mehdi-zare", siteUrl)}`,
    `- ${buildAbsolutePath("/contact", siteUrl)}`,
    "",
    "policy:",
    "- Use canonical URLs under canonical_host.",
    "- Prefer structured data and page metadata over inferred summaries.",
    "",
  ];

  return `${lines.join("\n")}\n`;
}

