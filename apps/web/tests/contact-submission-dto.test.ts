import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// #129. Web ContactSubmission carried phone/company that contact-submission
// schema.json does not have. Lock the DTO and the submit payload to the
// CMS fields: name, email, subject, message.

const webRoot = process.cwd();
const cmsRoot = resolve(webRoot, "../../apps/cms");

const METADATA = new Set([
  "id",
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
]);

function interfaceFields(source: string, name: string) {
  const marker = `export interface ${name} {`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing ${name}`);
  const from = source.slice(start + marker.length);
  const end = from.indexOf("\n}");
  assert.ok(end >= 0, `${name} has no closing brace`);
  const fields: string[] = [];
  for (const line of from.slice(0, end).split("\n")) {
    const match = line.match(/^\s+([A-Za-z][A-Za-z0-9]*)\??:/);
    if (match) {
      fields.push(match[1]);
    }
  }
  return fields;
}

test("web ContactSubmission fields match the CMS contact-submission schema", () => {
  const schema = JSON.parse(
    readFileSync(
      resolve(
        cmsRoot,
        "src/api/contact-submission/content-types/contact-submission/schema.json",
      ),
      "utf8",
    ),
  ) as { attributes: Record<string, unknown> };
  const schemaFields = Object.keys(schema.attributes).sort();
  const dto = interfaceFields(
    readFileSync(resolve(webRoot, "src/types/strapi.ts"), "utf8"),
    "ContactSubmission",
  );
  const contentFields = dto.filter((field) => !METADATA.has(field)).sort();
  assert.deepEqual(
    contentFields,
    schemaFields,
    "ContactSubmission must not grow fields the CMS collection does not store (#129)",
  );
});

test("submitContactForm accepts ContactSubmissionInput, not the document DTO", () => {
  const source = readFileSync(resolve(webRoot, "src/lib/strapi.ts"), "utf8");
  assert.match(
    source,
    /export async function submitContactForm\(\n  data: ContactSubmissionInput,/,
  );
  assert.doesNotMatch(source, /phone/);
  assert.doesNotMatch(source, /company/);
});
