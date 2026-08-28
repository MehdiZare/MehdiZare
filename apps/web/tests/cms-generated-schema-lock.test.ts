import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

// #125 / #128 / #130. Generated contentTypes.d.ts omitted category/tag schema
// fields. Lock every custom API and component schema attribute — name and
// Schema.Attribute kind — onto the generated interface so a later regen cannot
// silently drop or retitle them. Glob schema.json under src/api so a second
// content-type folder cannot go unlocked.
//
// Regenerate with `pnpm --filter=cms generate-types`. That script wipes
// apps/cms/dist first; a leftover dist reintroduces the retired page
// single-types (#121 / #128).

const cmsRoot = resolve(process.cwd(), "../../apps/cms");

const knownGaps = {
  category: ["parent", "children", "order", "headline", "intro", "seo"],
  tag: ["description", "headline", "intro", "seo"],
};

const SCHEMA_ATTRIBUTE_KIND: Record<string, string> = {
  biginteger: "BigInteger",
  blocks: "Blocks",
  boolean: "Boolean",
  component: "Component",
  date: "Date",
  datetime: "DateTime",
  decimal: "Decimal",
  email: "Email",
  enumeration: "Enumeration",
  float: "Float",
  integer: "Integer",
  json: "JSON",
  media: "Media",
  password: "Password",
  relation: "Relation",
  richtext: "RichText",
  string: "String",
  text: "Text",
  time: "Time",
  uid: "UID",
};

function pascal(name: string) {
  return name
    .split("-")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join("");
}

function* filesNamed(dir: string, fileName: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* filesNamed(path, fileName);
      continue;
    }
    if (entry.name === fileName) {
      yield path;
    }
  }
}

function* jsonFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      yield* jsonFiles(path);
      continue;
    }
    if (entry.name.endsWith(".json")) {
      yield path;
    }
  }
}

function schemaAttributes(schemaPath: string) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
    attributes?: Record<string, { type?: string }>;
  };
  assert.ok(schema.attributes, `${schemaPath} has no attributes`);
  return schema.attributes;
}

function schemaAttributeNames(apiName: string) {
  return Object.keys(
    schemaAttributes(
      resolve(
        cmsRoot,
        `src/api/${apiName}/content-types/${apiName}/schema.json`,
      ),
    ),
  );
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

function assertAttributesMatch(
  attrs: string,
  attributes: Record<string, { type?: string }>,
  source: string,
) {
  for (const [field, spec] of Object.entries(attributes)) {
    const type = spec.type ?? "";
    const kind = SCHEMA_ATTRIBUTE_KIND[type];
    assert.ok(
      kind,
      `${source} field "${field}" has unknown schema type "${type}"`,
    );
    assert.ok(
      attrs.includes(`\n    ${field}: Schema.Attribute.${kind}`),
      `${source} field "${field}" missing Schema.Attribute.${kind} on the generated interface`,
    );
  }
}

test("cms generate-types wipes dist before strapi ts:generate-types", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(cmsRoot, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(
    pkg.scripts?.["generate-types"],
    "rm -rf dist && strapi ts:generate-types",
    "apps/cms generate-types must wipe dist before strapi ts:generate-types (#128)",
  );
});

test("every API schema.json attribute appears with the right kind", () => {
  const source = readFileSync(
    resolve(cmsRoot, "types/generated/contentTypes.d.ts"),
    "utf8",
  );
  const apiRoot = resolve(cmsRoot, "src/api");
  const schemas = [...filesNamed(apiRoot, "schema.json")];
  assert.ok(schemas.length > 0, "expected at least one API schema.json");

  for (const schemaPath of schemas) {
    const rel = relative(apiRoot, schemaPath).split("/");
    assert.equal(
      rel[1],
      "content-types",
      `unexpected schema path ${relative(cmsRoot, schemaPath)}; expected src/api/<api>/content-types/<type>/schema.json`,
    );
    assert.equal(rel[3], "schema.json");
    const apiName = rel[0];
    const typeName = rel[2];
    const interfaceName = `Api${pascal(apiName)}${pascal(typeName)}`;
    const uid = `api::${apiName}.${typeName}`;
    assert.ok(
      source.includes(`'${uid}': ${interfaceName}`),
      `ContentTypeSchemas missing ${uid}`,
    );
    assertAttributesMatch(
      attributesBlock(interfaceBody(source, interfaceName)),
      schemaAttributes(schemaPath),
      uid,
    );
  }
});

test("every component schema attribute appears with the right kind", () => {
  const source = readFileSync(
    resolve(cmsRoot, "types/generated/components.d.ts"),
    "utf8",
  );
  const componentsRoot = resolve(cmsRoot, "src/components");
  const schemas = [...jsonFiles(componentsRoot)];
  assert.ok(schemas.length > 0, "expected at least one component schema");

  for (const schemaPath of schemas) {
    const rel = relative(componentsRoot, schemaPath).replace(/\.json$/, "");
    const uid = rel.split("/").join(".");
    const interfaceName = rel.split("/").map(pascal).join("");
    assert.ok(
      source.includes(`'${uid}': ${interfaceName}`),
      `ComponentSchemas missing ${uid}`,
    );
    assertAttributesMatch(
      attributesBlock(interfaceBody(source, interfaceName)),
      schemaAttributes(schemaPath),
      uid,
    );
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
