import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { buildHomeWritingCards } = await import("../src/content/fallbacks/home.ts");

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("homepage writing cards pad CMS results with fallbacks to fill the grid", () => {
  const cards = buildHomeWritingCards(
    [
      {
        title: "CMS article",
        href: "/blog/cms-article",
        excerpt: "From the CMS",
        eyebrow: "AI Engineering",
        meta: "5 min read",
      },
      {
        title: "Missing slug should be skipped",
        href: "",
      },
    ],
    [
      {
        title: "Medium one",
        href: "https://medium.com/one",
        excerpt: "Fallback one",
        eyebrow: "Towards AI",
        meta: "Apr 8, 2025",
        external: true,
      },
      {
        title: "Medium two",
        href: "https://medium.com/two",
        excerpt: "Fallback two",
        eyebrow: "Python in Plain English",
        meta: "Apr 10, 2025",
        external: true,
      },
    ]
  );

  assert.equal(cards.length, 3);
  assert.equal(cards[0]?.href, "/blog/cms-article");
  assert.equal(cards[0]?.external, false);
  assert.equal(cards[1]?.href, "https://medium.com/one");
  assert.equal(cards[1]?.external, true);
  assert.equal(cards[2]?.href, "https://medium.com/two");
});

test("homepage writing cards skip untitled or duplicate sources", () => {
  const cards = buildHomeWritingCards(
    [
      { title: "Same title", href: "/blog/same" },
      { title: "", href: "/blog/empty-title" },
    ],
    [
      { title: "Same title again", href: "/blog/same" },
      { title: "Unique fallback", href: "https://medium.com/unique", external: true },
    ],
    3
  );

  assert.deepEqual(
    cards.map((card) => card.href),
    ["/blog/same", "https://medium.com/unique"]
  );
});

test("homepage motion reveal variants do not hide content at opacity 0", () => {
  const sources = [
    readSource("src/components/shared/AnimatedSection.tsx"),
    readSource("src/components/home/Hero.tsx"),
    readSource("src/components/home/HeroStats.tsx"),
    readSource("src/components/home/ClientLogos.tsx"),
    readSource("src/components/home/CredentialsStrip.tsx"),
    readSource("src/components/home/TrackRecord.tsx"),
  ];

  for (const source of sources) {
    assert.doesNotMatch(source, /hidden:\s*\{\s*opacity:\s*0/);
    assert.match(source, /hidden:\s*\{/);
  }
});

test("AnimatedSection keeps a stable motion element instead of swapping to a div", () => {
  const source = readSource("src/components/shared/AnimatedSection.tsx");

  assert.doesNotMatch(source, /return <div className=\{cn\(className\)\}>\{children\}<\/div>/);
  assert.match(source, /initial = shouldReduceMotion \? false : "hidden"/);
});

test("CSP allows nested PostHog ingest and asset hosts", () => {
  const source = readSource("next.config.ts");

  assert.match(source, /https:\/\/\*\.posthog\.com/);
  assert.match(source, /https:\/\/\*\.i\.posthog\.com/);
  assert.match(source, /worker-src 'self' blob: data:/);
});
