import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("FAQ uses accessible disclosure attributes", () => {
  const source = readSource("src/components/consulting/FAQ.tsx");
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-controls/);
  assert.match(source, /role="region"/);
  assert.match(source, /aria-labelledby/);
});

test("Contact form exposes validation state to assistive tech", () => {
  const source = readSource("src/components/contact/ContactForm.tsx");
  assert.match(source, /aria-invalid/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /role="alert"/);
});

test("Motion provider respects user reduced-motion preferences", () => {
  const source = readSource("src/components/shared/MotionProvider.tsx");
  assert.match(source, /reducedMotion="user"/);
});
