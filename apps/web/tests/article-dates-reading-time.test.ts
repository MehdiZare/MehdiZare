import test from "node:test";
import assert from "node:assert/strict";

const { resolveArticleDates, toSitePublishTimestamp } = await import(
  "../src/lib/article-dates.ts"
);
const { countBlocksWords, resolveReadingTimeMinutes, WORDS_PER_MINUTE } = await import(
  "../src/lib/reading-time.ts"
);

// ── datePublished / dateModified (CM-02, GEO-10, TS-17) ────────────────

test("a date-only publishedDate is serialized at 09:00 New York time with the DST offset", () => {
  assert.equal(toSitePublishTimestamp("2026-08-30"), "2026-08-30T09:00:00-04:00");
  assert.equal(toSitePublishTimestamp("2026-01-15"), "2026-01-15T09:00:00-05:00");
  // DST starts 2026-03-08 and ends 2026-11-01 in America/New_York.
  assert.equal(toSitePublishTimestamp("2026-03-08"), "2026-03-08T09:00:00-04:00");
  assert.equal(toSitePublishTimestamp("2026-11-01"), "2026-11-01T09:00:00-05:00");
});

test("the serialized timestamp is the intended instant", () => {
  const iso = toSitePublishTimestamp("2026-08-30");
  assert.ok(iso);
  assert.equal(new Date(iso).toISOString(), "2026-08-30T13:00:00.000Z");
});

test("non date-only or impossible dates are rejected", () => {
  assert.equal(toSitePublishTimestamp("2026-02-30"), undefined);
  assert.equal(toSitePublishTimestamp("2026-8-30"), undefined);
  assert.equal(toSitePublishTimestamp("2026-08-30T10:00:00Z"), undefined);
  assert.equal(toSitePublishTimestamp(""), undefined);
});

test("datePublished prefers publishedDate and dateModified follows updatedAt", () => {
  assert.deepEqual(
    resolveArticleDates({
      publishedDate: "2026-08-30",
      publishedAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-02T08:00:00.000Z",
    }),
    {
      datePublished: "2026-08-30T09:00:00-04:00",
      dateModified: "2026-09-02T08:00:00.000Z",
    }
  );
});

test("dateModified never precedes datePublished", () => {
  // The live February post: no publishedDate, and Strapi stamped publishedAt a
  // few ms after updatedAt.
  assert.deepEqual(
    resolveArticleDates({
      publishedDate: null,
      publishedAt: "2026-02-25T14:55:26.603Z",
      updatedAt: "2026-02-25T14:55:26.569Z",
    }),
    {
      datePublished: "2026-02-25T14:55:26.603Z",
      dateModified: "2026-02-25T14:55:26.603Z",
    }
  );

  // A publishedDate later than the last save (back-filled date).
  assert.deepEqual(
    resolveArticleDates({
      publishedDate: "2026-08-30",
      publishedAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    }),
    {
      datePublished: "2026-08-30T09:00:00-04:00",
      dateModified: "2026-08-30T09:00:00-04:00",
    }
  );
});

test("missing or unparseable updatedAt falls back to datePublished", () => {
  assert.deepEqual(resolveArticleDates({ publishedDate: "2026-08-30", updatedAt: "nope" }), {
    datePublished: "2026-08-30T09:00:00-04:00",
    dateModified: "2026-08-30T09:00:00-04:00",
  });
  assert.deepEqual(resolveArticleDates({ publishedDate: " ", publishedAt: "" }), {
    datePublished: undefined,
    dateModified: undefined,
  });
});

test("dateModified prefers contentUpdatedAt over updatedAt, with the same clamp", () => {
  assert.deepEqual(
    resolveArticleDates({
      publishedDate: "2026-08-30",
      contentUpdatedAt: "2026-09-15T08:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    }),
    {
      datePublished: "2026-08-30T09:00:00-04:00",
      dateModified: "2026-09-15T08:00:00.000Z",
    }
  );
  assert.deepEqual(
    resolveArticleDates({
      publishedDate: "2026-08-30",
      contentUpdatedAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    }),
    {
      datePublished: "2026-08-30T09:00:00-04:00",
      dateModified: "2026-08-30T09:00:00-04:00",
    }
  );
});

// ── reading time (CM-10)───────────────────────────────────────────────

function paragraph(text: string) {
  return { type: "paragraph", children: [{ type: "text", text }] };
}

test("countBlocksWords counts text across nested blocks", () => {
  const content = [
    { type: "heading", level: 2, children: [{ type: "text", text: "Two words" }] },
    paragraph("one two three"),
    {
      type: "list",
      format: "unordered",
      children: [
        { type: "list-item", children: [{ type: "text", text: "alpha" }, { type: "link", url: "https://x", children: [{ type: "text", text: "beta gamma" }] }] },
      ],
    },
    { type: "image", image: { url: "/x.png" } },
  ];
  assert.equal(countBlocksWords(content), 8);
  assert.equal(countBlocksWords(null), 0);
  assert.equal(countBlocksWords([]), 0);
});

test("reading time uses the CMS value when set, otherwise ceil(words / 230)", () => {
  const words = (count: number) => [paragraph(Array.from({ length: count }, () => "word").join(" "))];

  assert.equal(WORDS_PER_MINUTE, 230);
  assert.equal(resolveReadingTimeMinutes(7, words(10)), 7);
  assert.equal(resolveReadingTimeMinutes(null, words(230)), 1);
  assert.equal(resolveReadingTimeMinutes(undefined, words(231)), 2);
  assert.equal(resolveReadingTimeMinutes(0, words(2405)), 11);
  assert.equal(resolveReadingTimeMinutes(undefined, words(5)), 1);
  assert.equal(resolveReadingTimeMinutes(undefined, []), undefined);
});
