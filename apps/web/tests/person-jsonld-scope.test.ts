import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { toPersonId } = await import("../src/lib/seo.ts");

function readSource(relativePath: string): string {
  return readFileSync(resolve(__dirname, "..", relativePath), "utf8");
}

test("global and author person IDs are distinct to avoid duplicate @id collisions", () => {
  const globalPersonId = toPersonId();
  const authorPersonId = toPersonId("/author/mehdi-zare");

  assert.equal(globalPersonId, "https://www.mehdi-zare.com/#person");
  assert.equal(authorPersonId, "https://www.mehdi-zare.com/author/mehdi-zare#person");
  assert.notEqual(globalPersonId, authorPersonId);
});

test("layout uses site-level person ID while author page uses profile-level person ID", () => {
  const layoutSource = readSource("src/app/layout.tsx");
  const authorPageSource = readSource("src/app/author/[slug]/page.tsx");

  assert.match(layoutSource, /const personId = toPersonId\(\)/);
  assert.doesNotMatch(layoutSource, /toPersonId\(personPath\)/);
  assert.match(authorPageSource, /const personId = toPersonId\(authorPath\)/);
});
