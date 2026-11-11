import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const {
  DEFAULT_ROBOTS,
  PERSON_SAME_AS,
  X_HANDLE,
  X_PROFILE_URL,
  buildBlogJsonLd,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildNoIndexMetadata,
  buildPageMetadata,
  buildPersonJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
  getSiteUrl,
  toPersonId,
  withRobotsPreviewDirectives,
} = await import("../src/lib/seo.ts");
const { resolveAuthorSameAs } = await import("../src/lib/author-identity.ts");
const { CANONICAL_IDENTITY_ORIGIN } = await import("../src/lib/site-profile-defaults.ts");

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const siteUrl = getSiteUrl();

const coverImage = {
  id: 1,
  documentId: "cover",
  name: "cover.webp",
  url: "/uploads/cover.webp",
  width: 1920,
  height: 1080,
  mime: "image/webp",
  alternativeText: null,
} as never;

const socialImage = {
  id: 2,
  documentId: "social",
  name: "social.png",
  url: "/uploads/social.png",
  width: 1200,
  height: 630,
  mime: "image/png",
  alternativeText: "Social card",
} as never;

const ogCard = {
  url: "/blog/some-post/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
};

type OgImage = { url: string; width?: number; height?: number; type?: string; alt?: string };

function ogImages(metadata: ReturnType<typeof buildPageMetadata>): OgImage[] {
  return (metadata.openGraph?.images ?? []) as OgImage[];
}

// ── og:image / twitter:image (IMG-02, CM-04, TS-03, IMG-04) ────────────

test("a post with no cover shares its own generated card, not the site card", () => {
  const metadata = buildPageMetadata({
    pathname: "/blog/some-post",
    title: "Some Post",
    description: "desc",
    defaultImage: ogCard,
    type: "article",
  });

  const [image] = ogImages(metadata);
  assert.equal(image.url, `${siteUrl}/blog/some-post/opengraph-image`);
  assert.equal(image.width, 1200);
  assert.equal(image.height, 630);
  assert.equal(image.type, "image/png");
  assert.deepEqual(metadata.twitter?.images, metadata.openGraph?.images);
});

test("the generated card wins over a WebP cover; seo.metaImage still overrides both", () => {
  const withCover = buildPageMetadata({
    pathname: "/blog/some-post",
    title: "Some Post",
    description: "desc",
    image: coverImage,
    defaultImage: ogCard,
    type: "article",
  });
  assert.equal(ogImages(withCover)[0].url, `${siteUrl}/blog/some-post/opengraph-image`);

  const withOverride = buildPageMetadata({
    pathname: "/blog/some-post",
    title: "Some Post",
    description: "desc",
    seo: { id: 1, metaImage: socialImage },
    image: coverImage,
    defaultImage: ogCard,
    type: "article",
  });
  const [override] = ogImages(withOverride);
  assert.ok(override.url.endsWith("/social.png"), override.url);
  assert.equal(override.type, "image/png");
  assert.equal(override.alt, "Social card");
});

test("pages without a default image keep the existing image, then the site card", () => {
  const withImage = buildPageMetadata({
    pathname: "/author/mehdi-zare",
    title: "Author",
    description: "desc",
    image: coverImage,
  });
  const [cover] = ogImages(withImage);
  assert.ok(cover.url.endsWith("/cover.webp"), cover.url);
  assert.equal(cover.type, "image/webp");

  const bare = buildPageMetadata({ pathname: "/about", title: "About", description: "desc" });
  const [siteCard] = ogImages(bare);
  assert.equal(siteCard.url, `${siteUrl}/opengraph-image`);
  assert.equal(siteCard.type, "image/png");
});

// ── twitter:site / article:* (GEO-11, TS-15) ───────────────────────────

test("every page carries twitter:site and twitter:creator for the owner's X handle", () => {
  const metadata = buildPageMetadata({ pathname: "/about", title: "About", description: "desc" });
  assert.equal(X_HANDLE, "@mehdizare");
  assert.equal(metadata.twitter?.site, X_HANDLE);
  assert.equal(metadata.twitter?.creator, X_HANDLE);

  const layoutSource = readSource("src/app/layout.tsx");
  assert.match(layoutSource, /site: X_HANDLE/);
  assert.match(layoutSource, /creator: X_HANDLE/);
});

test("articles carry article:author, article:section and article:tag", () => {
  const metadata = buildPageMetadata({
    pathname: "/blog/some-post",
    title: "Some Post",
    description: "desc",
    type: "article",
    authors: [`${siteUrl}/author/mehdi-zare`],
    section: "AI Engineering",
    tags: ["LLM", " ", "Agents"],
  });
  const openGraph = metadata.openGraph as Record<string, unknown>;
  assert.deepEqual(openGraph.authors, [`${siteUrl}/author/mehdi-zare`]);
  assert.equal(openGraph.section, "AI Engineering");
  assert.deepEqual(openGraph.tags, ["LLM", "Agents"]);
});

test("website pages never carry article:* fields", () => {
  const metadata = buildPageMetadata({
    pathname: "/about",
    title: "About",
    description: "desc",
    authors: ["https://example.com"],
    section: "x",
    tags: ["y"],
  });
  const openGraph = metadata.openGraph as Record<string, unknown>;
  assert.equal(openGraph.authors, undefined);
  assert.equal(openGraph.section, undefined);
  assert.equal(openGraph.tags, undefined);
});

// ── robots (GEO-13, IMG-10) ────────────────────────────────────────────

test("root robots opt in to large image previews and unlimited snippets", () => {
  assert.equal(DEFAULT_ROBOTS.index, true);
  assert.equal(DEFAULT_ROBOTS["max-image-preview"], "large");
  assert.equal(DEFAULT_ROBOTS["max-snippet"], -1);
  assert.equal(DEFAULT_ROBOTS.googleBot["max-image-preview"], "large");
  assert.equal(DEFAULT_ROBOTS.googleBot["max-snippet"], -1);

  assert.match(readSource("src/app/layout.tsx"), /robots: DEFAULT_ROBOTS/);
});

test("a CMS metaRobots override keeps the preview opt-ins unless it is noindex", () => {
  assert.equal(
    withRobotsPreviewDirectives("index, follow"),
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );
  assert.equal(
    withRobotsPreviewDirectives("index, follow, max-snippet:50"),
    "index, follow, max-snippet:50, max-image-preview:large, max-video-preview:-1"
  );
  assert.equal(withRobotsPreviewDirectives("noindex, follow"), "noindex, follow");
  assert.equal(withRobotsPreviewDirectives("none"), "none");

  const metadata = buildPageMetadata({
    pathname: "/blog/some-post",
    title: "Some Post",
    description: "desc",
    seo: { id: 1, metaRobots: "Index, Follow" },
  });
  assert.equal(
    metadata.robots,
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );
});

test("noindex pages still replace the root robots without preview directives", () => {
  assert.deepEqual(buildNoIndexMetadata("Post Not Found").robots, {
    index: false,
    follow: false,
  });
});

// ── Person (GEO-11, GEO-15) ────────────────────────────────────────────

test("Person sameAs carries the X profile and never the Person's own url", () => {
  assert.ok(PERSON_SAME_AS.includes(X_PROFILE_URL));
  assert.equal(X_PROFILE_URL, "https://x.com/mehdizare");
  assert.ok(!PERSON_SAME_AS.includes("https://www.mehdi-zare.com"));

  const person = buildPersonJsonLd({
    url: "https://www.mehdi-zare.com",
    sameAs: [
      "https://www.mehdi-zare.com/",
      "https://linkedin.com/in/mehdizare",
      X_PROFILE_URL,
    ],
  });
  assert.equal(person.url, "https://www.mehdi-zare.com/");
  assert.deepEqual(person.sameAs, ["https://linkedin.com/in/mehdizare", X_PROFILE_URL]);
});

test("Person credentials omit null and blank description, url and issuer", () => {
  const person = buildPersonJsonLd({
    credentials: [
      { name: "CFA Charterholder", issuer: "CFA Institute", description: null, url: null },
      { name: "FRM", issuer: "  ", description: "", url: undefined },
      { name: "  " },
    ],
  });
  const credentials = person.hasCredential as Array<Record<string, unknown>>;
  assert.equal(credentials.length, 2);
  assert.deepEqual(credentials[0], {
    "@type": "EducationalOccupationalCredential",
    name: "CFA Charterholder",
    credentialCategory: "CFA Institute",
  });
  assert.deepEqual(credentials[1], {
    "@type": "EducationalOccupationalCredential",
    name: "FRM",
  });
  assert.ok(!JSON.stringify(person).includes("null"));
});

// ── BlogPosting (CM-01, GEO-01, TS-04, IMG-11) ─────────────────────────

test("BlogPosting inlines the author Person with name, url, sameAs, jobTitle and image", () => {
  const posting = buildBlogPostingJsonLd({
    pathname: "/blog/some-post",
    headline: "Some Post",
    description: "desc",
    author: {
      id: toPersonId(),
      name: "Mehdi Zare, CFA",
      url: `${siteUrl}/author/mehdi-zare`,
      sameAs: ["https://linkedin.com/in/mehdizare", " ", `${siteUrl}/author/mehdi-zare/`],
      jobTitle: "Founder and AI consultant",
      imageUrl: `${siteUrl}/cms-media/uploads/headshot.jpg`,
    },
    publisherId: toPersonId(),
  });

  assert.deepEqual(posting.author, {
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: "Mehdi Zare, CFA",
    url: `${siteUrl}/author/mehdi-zare`,
    jobTitle: "Founder and AI consultant",
    image: `${siteUrl}/cms-media/uploads/headshot.jpg`,
    sameAs: ["https://linkedin.com/in/mehdizare"],
  });
  assert.deepEqual(posting.publisher, { "@id": `${siteUrl}/#person` });
});

test("BlogPosting omits empty author fields instead of emitting blanks", () => {
  const posting = buildBlogPostingJsonLd({
    pathname: "/blog/some-post",
    headline: "Some Post",
    description: "desc",
    author: { id: toPersonId(), name: "Mehdi Zare", jobTitle: " ", imageUrl: undefined, sameAs: [] },
  });
  assert.deepEqual(posting.author, {
    "@type": "Person",
    "@id": `${siteUrl}/#person`,
    name: "Mehdi Zare",
  });
});

test("BlogPosting image lists every ratio once, and always has the generated card", () => {
  const card = `${siteUrl}/blog/some-post/opengraph-image`;
  const cover = `${siteUrl}/cms-media/uploads/cover.webp`;

  const withCover = buildBlogPostingJsonLd({
    pathname: "/blog/some-post",
    headline: "Some Post",
    description: "desc",
    imageUrls: [cover, cover, card],
  });
  assert.deepEqual(withCover.image, [cover, card]);

  const coverless = buildBlogPostingJsonLd({
    pathname: "/blog/some-post",
    headline: "Some Post",
    description: "desc",
    imageUrls: [card],
  });
  assert.deepEqual(coverless.image, [card]);
});

test("every @id a post page references is defined on that page", () => {
  // The nodes the root layout and /blog/[slug] emit, built the way they build them.
  const personId = toPersonId();
  const graph = [
    buildWebsiteJsonLd({ publisherId: personId }),
    buildPersonJsonLd({ id: personId, url: siteUrl }),
    buildWebPageJsonLd({ pathname: "/blog/some-post", title: "Some Post", description: "desc" }),
    buildBlogPostingJsonLd({
      pathname: "/blog/some-post",
      headline: "Some Post",
      description: "desc",
      author: { id: personId, name: "Mehdi Zare", url: `${siteUrl}/author/mehdi-zare` },
      publisherId: personId,
    }),
    buildBreadcrumbJsonLd([{ name: "Home", path: "/" }]),
  ];

  const defined = new Set<string>();
  const referenced = new Set<string>();
  const walk = (node: unknown, isTopLevel: boolean) => {
    if (Array.isArray(node)) {
      node.forEach((child) => walk(child, false));
      return;
    }
    if (!node || typeof node !== "object") {
      return;
    }
    const record = node as Record<string, unknown>;
    const id = record["@id"];
    if (typeof id === "string") {
      // A node with only an @id is a reference; anything with a @type defines it.
      if (isTopLevel || "@type" in record) {
        defined.add(id);
      } else {
        referenced.add(id);
      }
    }
    Object.entries(record).forEach(([key, value]) => {
      if (key !== "@id") {
        walk(value, false);
      }
    });
  };
  graph.forEach((node) => walk(node, true));

  assert.ok(defined.has(personId));
  for (const id of referenced) {
    assert.ok(defined.has(id), `post page references ${id} but never defines it`);
  }
});

// ── Author sameAs helper ───────────────────────────────────────────────

test("resolveAuthorSameAs normalizes and dedupes identity URLs", () => {
  assert.deepEqual(
    resolveAuthorSameAs(
      { websiteUrl: "https://mehdi-zare.com/", linkedinUrl: "https://linkedin.com/in/mehdizare/" },
      [
        { url: "https://www.mehdi-zare.com" },
        { url: "https://linkedin.com/in/mehdizare" },
        { url: "" },
        { url: null },
        { url: "https://x.com/mehdizare" },
      ],
      CANONICAL_IDENTITY_ORIGIN
    ),
    ["https://www.mehdi-zare.com", "https://linkedin.com/in/mehdizare", "https://x.com/mehdizare"]
  );
});

// ── Post page wiring ───────────────────────────────────────────────────

test("the post page wires the card, the inline author, dates and reading time", () => {
  const source = readSource("src/app/blog/[slug]/page.tsx");

  assert.match(source, /`\/blog\/\$\{slug\}\/opengraph-image`/);
  assert.match(source, /defaultImage:\s*\{\s*url: articleOgCardPath\(slug\)/);
  assert.doesNotMatch(source, /authorId: authorPersonId/, "author must be inlined, not a bare @id");
  assert.match(source, /author:\s*\{\s*id: authorPersonId,\s*name: authorName,/);
  assert.match(source, /resolveArticleDates\(article\)/);
  assert.doesNotMatch(source, /dateModified: article\.updatedAt/);
  assert.doesNotMatch(source, /modifiedTime: article\.updatedAt/);
  assert.match(source, /resolveReadingTimeMinutes\(article\.readingTime, article\.content\)/);
  // CM-13: the author card renders the profile image, initials only as fallback.
  assert.match(source, /image=\{authorImage\}/);
  // IMG-07 / TS-10: the hero declares its rendered width.
  assert.match(source, /sizes=\{HERO_IMAGE_SIZES\}/);
});

test("StrapiImage forwards sizes and falls back to a non-empty alt", () => {
  const source = readSource("src/components/shared/StrapiImage.tsx");
  assert.match(source, /sizes=\{sizes\}/);
  assert.match(source, /blankToUndefined\(image\.alternativeText\) \?\? blankToUndefined\(fallbackAlt\)/);

  const postCard = readSource("src/components/blog/PostCard.tsx");
  assert.match(postCard, /sizes=\{POST_CARD_IMAGE_SIZES\}/);
  assert.match(postCard, /\(min-width: 768px\) 50vw/);
});

test("blog listing posts reference each post's own author Person id", () => {
  const blog = buildBlogJsonLd({
    pathname: "/blog",
    title: "Blog",
    description: "desc",
    authorId: `${siteUrl}/author/mehdi-zare#person`,
    posts: [
      { title: "Owner post", path: "/blog/a", authorId: toPersonId() },
      { title: "No per-post id", path: "/blog/b" },
    ],
  });
  const posts = blog.blogPost as Array<Record<string, Record<string, unknown>>>;
  assert.equal(posts[0].author["@id"], `${siteUrl}/#person`);
  assert.equal(posts[1].author["@id"], `${siteUrl}/author/mehdi-zare#person`);

  const listing = readSource("src/components/blog/BlogListPageContent.tsx");
  assert.match(listing, /authorId: resolveAuthorPersonId\(article\.author, DEFAULT_SITE_PROFILE\.authorSlug\)/);
});
