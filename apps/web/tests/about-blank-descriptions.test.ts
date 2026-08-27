import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { CareerTimeline } from "../src/components/about/CareerTimeline.tsx";
import { EducationList } from "../src/components/about/EducationList.tsx";
import type { Education, Experience } from "../src/types/strapi.ts";

// #89. `{value && <p>…</p>}` suppresses `""` but not `"   "` — a whitespace-only
// CMS string is truthy, so it renders an empty paragraph and leaves a stray
// vertical gap. #80 fixed this on category cards; these are the /about
// surfaces that still carried the raw pattern.
//
// These render the real components rather than grepping their source, so they
// fail on the rendered output regardless of how the guard is spelled.

function baseExperience(overrides: Partial<Experience> = {}): Experience {
  return {
    id: 1,
    title: "Principal AI Engineer",
    company: "Sev1Tech",
    startDate: "2023-01-01",
    current: true,
    ...overrides,
  };
}

function baseEducation(overrides: Partial<Education> = {}): Education {
  return {
    id: 1,
    degree: "MBA",
    institution: "University of Maryland, Smith School of Business",
    ...overrides,
  };
}

/** Paragraphs whose entire content is markup-free whitespace, or nothing. */
function emptyParagraphs(html: string): string[] {
  return html.match(/<p[^>]*>\s*<\/p>/g) ?? [];
}

function paragraphTexts(html: string): string[] {
  return [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
}

test("career timeline renders no paragraph for a whitespace-only description", () => {
  const html = renderToStaticMarkup(
    createElement(CareerTimeline, {
      experiences: [baseExperience({ description: "   " })],
    })
  );

  assert.deepEqual(emptyParagraphs(html), []);
});

test("career timeline renders no paragraph for an empty description", () => {
  const html = renderToStaticMarkup(
    createElement(CareerTimeline, {
      experiences: [baseExperience({ description: "" })],
    })
  );

  assert.deepEqual(emptyParagraphs(html), []);
});

test("career timeline still renders a filled description, trimmed", () => {
  const html = renderToStaticMarkup(
    createElement(CareerTimeline, {
      experiences: [baseExperience({ description: "  Shipping production AI.  " })],
    })
  );

  assert.ok(
    paragraphTexts(html).includes("Shipping production AI."),
    `expected the description paragraph, got ${JSON.stringify(paragraphTexts(html))}`
  );
});

test("education list renders no paragraph for a whitespace-only description", () => {
  const html = renderToStaticMarkup(
    createElement(EducationList, {
      education: [baseEducation({ description: "   " })],
    })
  );

  assert.deepEqual(emptyParagraphs(html), []);
});

test("education list renders no paragraph for an empty description", () => {
  const html = renderToStaticMarkup(
    createElement(EducationList, {
      education: [baseEducation({ description: "" })],
    })
  );

  assert.deepEqual(emptyParagraphs(html), []);
});

test("education list still renders a filled description, trimmed", () => {
  const html = renderToStaticMarkup(
    createElement(EducationList, {
      education: [baseEducation({ description: "  Finance concentration.  " })],
    })
  );

  assert.ok(
    paragraphTexts(html).includes("Finance concentration."),
    `expected the description paragraph, got ${JSON.stringify(paragraphTexts(html))}`
  );
});

test("education list keeps the degree and field heading it already rendered", () => {
  // The education block moved out of about/page.tsx into its own component so
  // it could be rendered here; this pins the markup that move had to preserve.
  const html = renderToStaticMarkup(
    createElement(EducationList, {
      education: [baseEducation({ field: "Finance" })],
    })
  );

  assert.match(html, /MBA, Finance/);
  assert.match(html, /University of Maryland, Smith School of Business/);
});

test("education list omits the field separator when there is no field", () => {
  const html = renderToStaticMarkup(
    createElement(EducationList, { education: [baseEducation()] })
  );

  assert.match(html, /MBA/);
  assert.doesNotMatch(html, /MBA,/);
});

test("education list treats a whitespace-only field as absent", () => {
  const html = renderToStaticMarkup(
    createElement(EducationList, { education: [baseEducation({ field: "   " })] })
  );

  assert.doesNotMatch(html, /MBA,/);
});
