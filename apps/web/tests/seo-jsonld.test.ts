import test from "node:test";
import assert from "node:assert/strict";

const {
  buildWebsiteJsonLd,
  buildPersonJsonLd,
  buildWebPageJsonLd,
  buildProfilePageJsonLd,
  buildBreadcrumbJsonLd,
  buildBlogPostingJsonLd,
  buildBlogJsonLd,
  buildFAQJsonLd,
  buildPageMetadata,
  composeDocumentTitle,
  resolveCanonicalUrl,
} = await import("../src/lib/seo.ts");

// ── WebSite JSON-LD ────────────────────────────────────────────────────

test("buildWebsiteJsonLd emits correct @context and @type", () => {
  const result = buildWebsiteJsonLd();
  assert.equal(result["@context"], "https://schema.org");
  assert.equal(result["@type"], "WebSite");
});

test("buildWebsiteJsonLd includes @id with #website fragment", () => {
  const result = buildWebsiteJsonLd();
  assert.ok((result["@id"] as string).endsWith("/#website"));
});

test("buildWebsiteJsonLd references publisher via #person @id", () => {
  const result = buildWebsiteJsonLd();
  const publisher = result.publisher as Record<string, unknown>;
  assert.ok((publisher["@id"] as string).endsWith("/#person"));
});

test("buildWebsiteJsonLd accepts name and description overrides", () => {
  const result = buildWebsiteJsonLd({ name: "Custom Name", description: "Custom desc" });
  assert.equal(result.name, "Custom Name");
  assert.equal(result.description, "Custom desc");
});

test("resolveCanonicalUrl keeps configured canonical host for relative paths", () => {
  const result = resolveCanonicalUrl("/blog/category/ai-engineering");
  assert.equal(result, "https://www.mehdi-zare.com/blog/category/ai-engineering");
});

test("resolveCanonicalUrl forces configured canonical host for absolute overrides", () => {
  const result = resolveCanonicalUrl(
    "/blog/category/ai-engineering",
    "https://mehdi-zare.com/blog/category/ai-engineering"
  );
  assert.equal(result, "https://www.mehdi-zare.com/blog/category/ai-engineering");
});

test("composeDocumentTitle keeps homepage titles that already lead with the site name", () => {
  assert.equal(
    composeDocumentTitle("Mehdi Zare — Principal AI Engineer · CFA Charterholder"),
    "Mehdi Zare — Principal AI Engineer · CFA Charterholder",
  );
});

test("composeDocumentTitle appends the site name to short inner-page titles", () => {
  assert.equal(composeDocumentTitle("About"), "About | Mehdi Zare");
  assert.equal(composeDocumentTitle("Get in Touch"), "Get in Touch | Mehdi Zare");
});

test("buildPageMetadata uses the composed title for document, Open Graph, and Twitter", () => {
  const metadata = buildPageMetadata({
    pathname: "/about",
    title: "About",
    description: "About page",
  });
  assert.deepEqual(metadata.title, { absolute: "About | Mehdi Zare" });
  assert.equal(metadata.openGraph?.title, "About | Mehdi Zare");
  assert.equal(metadata.twitter?.title, "About | Mehdi Zare");
});

// ── Person JSON-LD ─────────────────────────────────────────────────────

test("buildPersonJsonLd emits correct @type and @id", () => {
  const result = buildPersonJsonLd();
  assert.equal(result["@type"], "Person");
  assert.ok((result["@id"] as string).endsWith("/#person"));
});

test("buildPersonJsonLd includes sameAs as an array", () => {
  const result = buildPersonJsonLd();
  assert.ok(Array.isArray(result.sameAs));
  assert.ok((result.sameAs as string[]).length > 0);
});

test("buildPersonJsonLd includes knowsAbout", () => {
  const result = buildPersonJsonLd();
  assert.ok(Array.isArray(result.knowsAbout));
  assert.ok((result.knowsAbout as string[]).length > 0);
});

test("buildPersonJsonLd accepts overrides", () => {
  const result = buildPersonJsonLd({
    name: "Test Person",
    title: "Test Title",
    sameAs: ["https://example.com"],
  });
  assert.equal(result.name, "Test Person");
  assert.equal(result.jobTitle, "Test Title");
  assert.deepEqual(result.sameAs, ["https://example.com"]);
});

test("buildPersonJsonLd supports canonical author path and mainEntityOfPage", () => {
  const result = buildPersonJsonLd({
    path: "/author/mehdi-zare",
    mainEntityOfPagePath: "/author/mehdi-zare",
  });
  assert.ok((result["@id"] as string).includes("/author/mehdi-zare#person"));
  const mainEntity = result.mainEntityOfPage as Record<string, unknown>;
  assert.ok((mainEntity["@id"] as string).includes("/author/mehdi-zare#webpage"));
});

// ── WebPage JSON-LD ────────────────────────────────────────────────────

test("buildWebPageJsonLd emits correct structure", () => {
  const result = buildWebPageJsonLd({
    pathname: "/about",
    title: "About",
    description: "About page",
  });
  assert.equal(result["@context"], "https://schema.org");
  assert.equal(result["@type"], "WebPage");
  assert.ok((result["@id"] as string).includes("/about#webpage"));
  assert.equal(result.name, "About");
  assert.equal(result.description, "About page");
});

test("buildWebPageJsonLd supports custom type", () => {
  const result = buildWebPageJsonLd({
    pathname: "/about",
    title: "About",
    description: "About page",
    type: "AboutPage",
  });
  assert.equal(result["@type"], "AboutPage");
});

test("buildWebPageJsonLd references parent website via isPartOf", () => {
  const result = buildWebPageJsonLd({
    pathname: "/test",
    title: "Test",
    description: "desc",
  });
  const isPartOf = result.isPartOf as Record<string, unknown>;
  assert.ok((isPartOf["@id"] as string).endsWith("/#website"));
});

test("buildProfilePageJsonLd links ProfilePage mainEntity to person @id", () => {
  const result = buildProfilePageJsonLd({
    pathname: "/author/mehdi-zare",
    title: "Mehdi Zare",
    description: "Author profile",
    personId: "https://mehdi-zare.com/author/mehdi-zare#person",
  });
  assert.equal(result["@type"], "ProfilePage");
  const mainEntity = result.mainEntity as Record<string, unknown>;
  assert.equal(mainEntity["@id"], "https://mehdi-zare.com/author/mehdi-zare#person");
});

// ── BreadcrumbList JSON-LD ─────────────────────────────────────────────

test("buildBreadcrumbJsonLd emits correct ListItem entries", () => {
  const result = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: "Post Title", path: "/blog/post-slug" },
  ]);
  assert.equal(result["@type"], "BreadcrumbList");
  const items = result.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items.length, 3);
  assert.equal(items[0].position, 1);
  assert.equal(items[0].name, "Home");
  assert.equal(items[1].position, 2);
  assert.equal(items[2].position, 3);
  assert.equal(items[2].name, "Post Title");
});

test("buildBreadcrumbJsonLd generates absolute item URLs", () => {
  const result = buildBreadcrumbJsonLd([{ name: "Blog", path: "/blog" }]);
  const items = result.itemListElement as Array<Record<string, unknown>>;
  assert.ok((items[0].item as string).startsWith("http"));
});

// ── BlogPosting JSON-LD ────────────────────────────────────────────────

test("buildBlogPostingJsonLd emits required fields", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test-post",
    headline: "Test Post",
    description: "A test post description",
    datePublished: "2025-01-15",
    dateModified: "2025-01-16",
  });
  assert.equal(result["@type"], "BlogPosting");
  assert.equal(result.headline, "Test Post");
  assert.equal(result.description, "A test post description");
  assert.equal(result.datePublished, "2025-01-15");
  assert.equal(result.dateModified, "2025-01-16");
  assert.equal(result.isAccessibleForFree, true);
  assert.equal(result.inLanguage, "en-US");
});

test("buildBlogPostingJsonLd includes @id with #blogposting fragment", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
  });
  assert.ok((result["@id"] as string).includes("/blog/test#blogposting"));
});

test("buildBlogPostingJsonLd references author and publisher via #person", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
  });
  const author = result.author as Record<string, unknown>;
  const publisher = result.publisher as Record<string, unknown>;
  assert.ok((author["@id"] as string).endsWith("/#person"));
  assert.ok((publisher["@id"] as string).endsWith("/#person"));
});

test("buildBlogPostingJsonLd computes timeRequired from readingTimeMinutes", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
    readingTimeMinutes: 5,
  });
  assert.equal(result.timeRequired, "PT5M");
});

test("buildBlogPostingJsonLd omits timeRequired when readingTimeMinutes is absent", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
  });
  assert.equal(result.timeRequired, undefined);
});

test("buildBlogPostingJsonLd wraps imageUrl in array", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
    imageUrl: "https://example.com/img.jpg",
  });
  assert.deepEqual(result.image, ["https://example.com/img.jpg"]);
});

test("buildBlogPostingJsonLd supports explicit author and publisher IDs", () => {
  const result = buildBlogPostingJsonLd({
    pathname: "/blog/test",
    headline: "Test",
    description: "desc",
    authorId: "https://mehdi-zare.com/author/mehdi-zare#person",
    publisherId: "https://mehdi-zare.com/author/mehdi-zare#person",
  });
  const author = result.author as Record<string, unknown>;
  const publisher = result.publisher as Record<string, unknown>;
  assert.equal(author["@id"], "https://mehdi-zare.com/author/mehdi-zare#person");
  assert.equal(publisher["@id"], "https://mehdi-zare.com/author/mehdi-zare#person");
});

// ── Blog JSON-LD ───────────────────────────────────────────────────────

test("buildBlogJsonLd emits Blog type with blogPost array", () => {
  const result = buildBlogJsonLd({
    pathname: "/blog",
    title: "Blog",
    description: "All posts",
    posts: [
      { title: "Post 1", path: "/blog/post-1", datePublished: "2025-01-01" },
      { title: "Post 2", path: "/blog/post-2" },
    ],
  });
  assert.equal(result["@type"], "Blog");
  const posts = result.blogPost as Array<Record<string, unknown>>;
  assert.equal(posts.length, 2);
  assert.equal(posts[0]["@type"], "BlogPosting");
  assert.equal(posts[0].headline, "Post 1");
  assert.equal(posts[1].headline, "Post 2");
});

test("buildBlogJsonLd child BlogPosting entries reference author via #person", () => {
  const result = buildBlogJsonLd({
    pathname: "/blog",
    title: "Blog",
    description: "desc",
    posts: [{ title: "Post", path: "/blog/post" }],
  });
  const posts = result.blogPost as Array<Record<string, unknown>>;
  const author = posts[0].author as Record<string, unknown>;
  assert.ok((author["@id"] as string).endsWith("/#person"));
});

test("buildBlogJsonLd supports explicit author IDs for child posts", () => {
  const result = buildBlogJsonLd({
    pathname: "/blog",
    title: "Blog",
    description: "desc",
    authorId: "https://mehdi-zare.com/author/mehdi-zare#person",
    posts: [{ title: "Post", path: "/blog/post" }],
  });
  const posts = result.blogPost as Array<Record<string, unknown>>;
  const author = posts[0].author as Record<string, unknown>;
  assert.equal(author["@id"], "https://mehdi-zare.com/author/mehdi-zare#person");
});

// ── FAQPage JSON-LD ────────────────────────────────────────────────────

test("buildFAQJsonLd returns null for empty items", () => {
  const result = buildFAQJsonLd([]);
  assert.equal(result, null);
});

test("buildFAQJsonLd emits FAQPage with Question/Answer pairs", () => {
  const result = buildFAQJsonLd([
    { question: "What is AI?", answer: "Artificial Intelligence." },
    { question: "Why AI?", answer: "Because it helps." },
  ]);
  assert.ok(result !== null);
  assert.equal(result!["@type"], "FAQPage");
  const entities = result!.mainEntity as Array<Record<string, unknown>>;
  assert.equal(entities.length, 2);
  assert.equal(entities[0]["@type"], "Question");
  assert.equal(entities[0].name, "What is AI?");
  const answer = entities[0].acceptedAnswer as Record<string, unknown>;
  assert.equal(answer["@type"], "Answer");
  assert.equal(answer.text, "Artificial Intelligence.");
});
