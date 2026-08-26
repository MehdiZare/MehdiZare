import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const forbiddenTerms = [
  /\bCISA\b/i,
  /\bgovernment\b/i,
  /\bdefense\b/i,
  /\bclearance\b/i,
  /\bfederal\b/i,
  /\bnational security\b/i,
];

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("AI engineer landing is a dedicated non-blog route titled to the query", () => {
  const page = readSource("src/app/ai-engineer/page.tsx");
  const fallback = readSource("src/content/fallbacks/ai-engineer.ts");

  assert.match(page, /pathname = "\/ai-engineer"/);
  assert.match(page, /title: aiEngineerMetadataTitle/);
  assert.match(page, /getSiteProfile/);
  assert.match(fallback, /export const aiEngineerMetadataTitle = "AI Engineer"/);
  assert.match(fallback, /`AI engineer \$\{siteProfile\.siteName\}/);
  assert.doesNotMatch(fallback, /AI engineer Mehdi Zare/);
  assert.doesNotMatch(page, /\/blog\//);
  assert.match(readSource("src/components/layout/Footer.tsx"), /href: "\/ai-engineer"/);
  assert.match(readSource("src/components/home/ServicesGrid.tsx"), /href: "\/ai-engineer"/);
  assert.match(readSource("src/app/about/page.tsx"), /AiEngineerProfileLink/);
  assert.match(
    readSource("src/app/blog/[slug]/page.tsx"),
    /how-ai-works-from-data-to-decisions/
  );
  assert.match(
    readSource("src/app/blog/[slug]/page.tsx"),
    /why-most-ai-projects-die-before-production-and-it-s-not-a-tech-problem/
  );
  assert.match(readSource("src/app/blog/[slug]/page.tsx"), /AiEngineerProfileLink/);
  assert.match(
    readSource("src/components/seo/AiEngineerProfileLink.tsx"),
    /href="\/ai-engineer"/
  );
  assert.doesNotMatch(
    readSource("src/app/consulting/page.tsx"),
    /AiEngineerProfileLink/
  );
});

test("AI engineer landing copy stays AI/finance and omits government/CISA", () => {
  const sources = [
    readSource("src/app/ai-engineer/page.tsx"),
    readSource("src/content/fallbacks/ai-engineer.ts"),
  ];

  for (const source of sources) {
    for (const term of forbiddenTerms) {
      assert.doesNotMatch(source, term);
    }
  }

  const fallback = sources[1];
  assert.match(fallback, /finance/i);
  assert.match(fallback, /CFA/);
});
