import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { buildHomeWritingCards } = await import("../src/content/fallbacks/home.ts");

const mediumFallbacks = [
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
  {
    title: "Medium three",
    href: "https://medium.com/three",
    excerpt: "Fallback three",
    eyebrow: "Towards AI",
    meta: "Apr 14, 2025",
    external: true,
  },
];

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
    mediumFallbacks
  );

  assert.equal(cards.length, 3);
  assert.equal(cards[0]?.href, "/blog/cms-article");
  assert.equal(cards[0]?.external, false);
  assert.equal(cards[1]?.href, "https://medium.com/one");
  assert.equal(cards[1]?.external, true);
  assert.equal(cards[2]?.href, "https://medium.com/two");
});

test("homepage writing cards fill the grid from fallbacks when CMS is empty", () => {
  const cards = buildHomeWritingCards([], mediumFallbacks);

  assert.equal(cards.length, 3);
  assert.deepEqual(
    cards.map((card) => card.href),
    ["https://medium.com/one", "https://medium.com/two", "https://medium.com/three"]
  );
  assert.ok(cards.every((card) => card.external));
});

test("homepage writing cards return no cards when CMS and fallbacks are empty", () => {
  assert.deepEqual(buildHomeWritingCards([], []), []);
});

test("homepage writing cards skip untitled, whitespace-only, or duplicate sources", () => {
  const cards = buildHomeWritingCards(
    [
      { title: "Same title", href: "/blog/same" },
      { title: "", href: "/blog/empty-title" },
      { title: "   ", href: "/blog/whitespace-title" },
      { title: null, href: "/blog/null-title" },
      { title: "Whitespace href", href: "   " },
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

test("homepage writing cards cap at the limit and do not pad a full CMS grid", () => {
  const cards = buildHomeWritingCards(
    [
      { title: "One", href: "/blog/one" },
      { title: "Two", href: "/blog/two" },
      { title: "Three", href: "/blog/three" },
      { title: "Four should not appear", href: "/blog/four" },
    ],
    mediumFallbacks,
    3
  );

  assert.deepEqual(
    cards.map((card) => card.href),
    ["/blog/one", "/blog/two", "/blog/three"]
  );
  assert.ok(cards.every((card) => !card.external));
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
    assert.doesNotMatch(source, /opacity:\s*0/);
    assert.match(source, /hidden:\s*\{/);
  }
});

test("AnimatedSection keeps a stable motion element and a hydration-safe initial state", () => {
  const source = readSource("src/components/shared/AnimatedSection.tsx");

  assert.doesNotMatch(source, /useReducedMotion/);
  assert.doesNotMatch(source, /<div className=\{cn\(className\)\}>\{children\}<\/div>/);
  assert.match(source, /<motion\.div/);
  assert.match(source, /initial="hidden"/);
  assert.doesNotMatch(source, /staggerChildVariants/);
  assert.doesNotMatch(source, /staggerContainerVariants/);
  assert.doesNotMatch(source, /stagger\?:/);
});

test("WritingSection pads CMS rows through the shared helper and keys the CTA off rendered cards", () => {
  const source = readSource("src/components/home/WritingSection.tsx");

  assert.match(source, /try \{/);
  assert.match(source, /Array\.isArray\(response\.data\)/);
  assert.match(source, /buildHomeWritingCards\(/);
  assert.match(source, /mediumPublications/);
  assert.match(source, /cards\.some\(\(card\) => !card\.external\)/);
});

// The CSP is asserted against the built header in csp-contract.test.ts rather
// than by grepping next.config.ts for the expressions that produce it.
