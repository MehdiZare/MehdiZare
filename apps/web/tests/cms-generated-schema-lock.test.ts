import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// #125. Generated contentTypes.d.ts omitted category/tag schema fields
// (parent/children/order/headline/intro/seo, and tag description/headline/
// intro/seo). Lock schema.json attributes onto the generated interface so a
// later regen cannot silently drop them.
//
// `strapi ts:generate-types` must run after wiping apps/cms/dist; a stale
// dist reintroduces the retired page single-types.

const cmsRoot = resolve(process.cwd(), "../../apps/cms");

const knownGaps = {
  category: ["parent", "children", "order", "headline", "intro", "seo"],
  tag: ["description", "headline", "intro", "seo"],
};

function pascal(name: string) {
  return name
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
}

function apiNames() {
  return readdirSync(resolve(cmsRoot, "src/api"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function schemaAttributeNames(apiName: string) {
  const schema = JSON.parse(
    readFileSync(
      resolve(
        cmsRoot,
        `src/api/${apiName}/content-types/${apiName}/schema.json`,
      ),
      "utf8",
    ),
  ) as { attributes: Record<string, unknown> };
  return Object.keys(schema.attributes);
}

function interfaceBody(source: string, name: string) {
  const marker = `export interface ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `generated types missing ${name}`);
  const from = source.slice(start);
  const next = from.search(/\nexport interface |\ndeclare module /);
  return next === -1 ? from : from.slice(0, next);
}

function attributesBlock(body: string) {
  const idx = body.indexOf("attributes: {");
  assert.ok(idx >= 0, `${body.slice(0, 40)} has no attributes block`);
  return body.slice(idx);
}

test("every schema.json attribute appears on the generated content type", () => {
  const source = readFileSync(
    resolve(cmsRoot, "types/generated/contentTypes.d.ts"),
    "utf8",
  );
  const apis = apiNames();
  assert.ok(apis.includes("category"), "expected category API");
  assert.ok(apis.includes("tag"), "expected tag API");

  for (const apiName of apis) {
    const fields = schemaAttributeNames(apiName);
    const interfaceName = `Api${pascal(apiName)}${pascal(apiName)}`;
    const attrs = attributesBlock(interfaceBody(source, interfaceName));
    for (const field of fields) {
      assert.ok(
        attrs.includes(`\n    ${field}: Schema.Attribute.`),
        `${apiName} schema field "${field}" missing from ${interfaceName}`,
      );
    }
  }
});

test("the category and tag fields that were omitted stay in schema.json", () => {
  for (const [apiName, fields] of Object.entries(knownGaps)) {
    const present = schemaAttributeNames(apiName);
    for (const field of fields) {
      assert.ok(
        present.includes(field),
        `${apiName} schema.json must still define ${field} (#125)`,
      );
    }
  }
});
