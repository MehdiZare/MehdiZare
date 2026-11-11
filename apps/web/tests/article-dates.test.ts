import test from "node:test";
import assert from "node:assert/strict";

const {
  ARTICLE_LISTING_SORT,
  resolveArticleDates,
  resolveArticleLastModified,
  resolveArticlePublishedDate,
  sortArticlesByPublishedDesc,
} = await import("../src/lib/article-dates.ts");

const iso = (date: Date | undefined) => date?.toISOString();

test("listings sort by editorial date, then system publish time (CM-02)", () => {
  assert.deepEqual(ARTICLE_LISTING_SORT, ["publishedDate:desc", "publishedAt:desc"]);
});

test("published date is publishedDate at 09:00 New York; publishedAt only when it is empty", () => {
  assert.equal(
    iso(resolveArticlePublishedDate({ publishedDate: "2026-08-30", publishedAt: "2026-08-30T14:00:00.000Z" })),
    "2026-08-30T13:00:00.000Z",
    "a same-day system publish time does not replace the 09:00 rule"
  );
  assert.equal(
    iso(resolveArticlePublishedDate({ publishedDate: "2026-02-25", publishedAt: "2026-09-10T12:00:00.000Z" })),
    "2026-02-25T14:00:00.000Z",
    "a re-publish on another day does not move the editorial date (EST, -05:00)"
  );
  assert.equal(
    iso(resolveArticlePublishedDate({ publishedDate: null, publishedAt: "2026-02-25T14:55:26.603Z" })),
    "2026-02-25T14:55:26.603Z",
    "undated posts fall back to the system publish time"
  );
  assert.equal(resolveArticlePublishedDate({ publishedDate: "nope", publishedAt: "" }), undefined);
});

test("the Date wrappers are the same instants as the JSON-LD strings", () => {
  const article = {
    publishedDate: "2026-08-30",
    publishedAt: "2026-08-30T14:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
  const { datePublished, dateModified } = resolveArticleDates(article);
  assert.equal(resolveArticlePublishedDate(article)?.getTime(), Date.parse(datePublished ?? ""));
  assert.equal(resolveArticleLastModified(article)?.getTime(), Date.parse(dateModified ?? ""));
});

test("lastmod is updatedAt (or contentUpdatedAt), clamped to never precede datePublished", () => {
  assert.equal(
    iso(
      resolveArticleLastModified({
        publishedDate: "2026-08-30",
        publishedAt: "2026-08-30T14:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
      })
    ),
    "2026-10-01T00:00:00.000Z",
    "a later edit moves lastmod"
  );
  assert.equal(
    iso(
      resolveArticleLastModified({
        publishedDate: "2026-08-30",
        contentUpdatedAt: "2026-09-15T08:00:00.000Z",
        publishedAt: "2026-08-30T14:00:00.000Z",
        updatedAt: "2026-09-15T08:05:00.000Z",
      })
    ),
    "2026-09-15T08:00:00.000Z",
    "an editor-set content update replaces updatedAt once the field exists"
  );
  assert.equal(
    iso(
      resolveArticleLastModified({
        publishedDate: "2026-08-30",
        publishedAt: "2026-08-30T10:00:00.000Z",
        updatedAt: "2026-08-30T10:00:00.000Z",
      })
    ),
    "2026-08-30T13:00:00.000Z",
    "an updatedAt before the 09:00 publish instant is clamped up to it"
  );
  assert.equal(
    iso(
      resolveArticleLastModified({
        publishedDate: "2099-01-01",
        publishedAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-02T10:00:00.000Z",
      })
    ),
    "2099-01-01T14:00:00.000Z",
    "never earlier than datePublished, even for a future-dated post"
  );
  assert.equal(
    iso(resolveArticleLastModified({ publishedAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-03T10:00:00.000Z" })),
    "2026-08-03T10:00:00.000Z",
    "undated posts use updatedAt"
  );
  assert.equal(resolveArticleLastModified({ updatedAt: "invalid", publishedAt: null }), undefined);
});

test("sorting puts an undated post by its publishedAt, not first", () => {
  const sorted = sortArticlesByPublishedDesc([
    { id: "dated-old", publishedDate: "2026-03-01", publishedAt: "2026-03-01T09:00:00.000Z" },
    { id: "undated", publishedDate: null, publishedAt: "2026-02-25T14:55:26.603Z" },
    { id: "dated-new", publishedDate: "2026-08-30", publishedAt: "2026-08-30T14:00:00.000Z" },
    { id: "republished", publishedDate: "2026-05-01", publishedAt: "2026-10-01T00:00:00.000Z" },
  ]);
  assert.deepEqual(
    sorted.map((article) => article.id),
    ["dated-new", "republished", "dated-old", "undated"]
  );
});

test("same-day posts tie on datePublished and fall back to publishedAt", () => {
  const sorted = sortArticlesByPublishedDesc([
    { id: "morning", publishedDate: "2026-08-30", publishedAt: "2026-08-30T12:00:00.000Z" },
    { id: "evening", publishedDate: "2026-08-30", publishedAt: "2026-08-30T22:00:00.000Z" },
  ]);
  assert.deepEqual(
    sorted.map((article) => article.id),
    ["evening", "morning"]
  );
});
