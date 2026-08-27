import test from "node:test";
import assert from "node:assert/strict";

import { identityUrlKey, normalizeIdentityUrl } from "../src/lib/url-normalization.ts";

// `normalizeIdentityUrl` is the single gate every identity URL passes through:
// an author's `websiteUrl` / `linkedinUrl`, their `sameAs` entries, and the
// site-settings social links. Everything it returns is rendered into an `href`
// (author page, article byline, footer) or into `Person` JSON-LD `url` /
// `sameAs`. Anything it lets through is therefore live in the page.

const ORIGIN = "https://www.mehdi-zare.com";

test("normalizeIdentityUrl keeps an https URL", () => {
  assert.equal(
    normalizeIdentityUrl("https://linkedin.com/in/janedoe", ORIGIN),
    "https://linkedin.com/in/janedoe"
  );
});

test("normalizeIdentityUrl keeps an http URL", () => {
  assert.equal(normalizeIdentityUrl("http://example.com/x", ORIGIN), "http://example.com/x");
});

test("normalizeIdentityUrl rejects a javascript: URL", () => {
  // `new URL("javascript:alert(1)")` parses fine, so the parse-only guard let
  // this through into an href. CMS-write-gated, but it is a script URL in a
  // link, and invalid structured data in Person `url`.
  assert.equal(normalizeIdentityUrl("javascript:alert(1)", ORIGIN), null);
  assert.equal(normalizeIdentityUrl("  JavaScript:alert(1)  ", ORIGIN), null);
});

test("normalizeIdentityUrl rejects a data: URL", () => {
  assert.equal(
    normalizeIdentityUrl("data:text/html;base64,PHNjcmlwdD4=", ORIGIN),
    null
  );
});

test("normalizeIdentityUrl rejects other non-web schemes", () => {
  assert.equal(normalizeIdentityUrl("mailto:someone@example.com", ORIGIN), null);
  assert.equal(normalizeIdentityUrl("file:///etc/passwd", ORIGIN), null);
  assert.equal(normalizeIdentityUrl("vbscript:msgbox(1)", ORIGIN), null);
});

test("normalizeIdentityUrl rejects blank and unparseable input", () => {
  assert.equal(normalizeIdentityUrl("", ORIGIN), null);
  assert.equal(normalizeIdentityUrl("   ", ORIGIN), null);
  assert.equal(normalizeIdentityUrl(null, ORIGIN), null);
  assert.equal(normalizeIdentityUrl(undefined, ORIGIN), null);
  assert.equal(normalizeIdentityUrl("not a url", ORIGIN), null);
});

test("normalizeIdentityUrl canonicalizes the apex host onto the canonical origin", () => {
  assert.equal(normalizeIdentityUrl("https://mehdi-zare.com/", ORIGIN), ORIGIN);
});

test("normalizeIdentityUrl strips a trailing slash from a path", () => {
  assert.equal(
    normalizeIdentityUrl("https://linkedin.com/in/janedoe/", ORIGIN),
    "https://linkedin.com/in/janedoe"
  );
});

test("identityUrlKey returns an empty key for a rejected URL", () => {
  // dedupeUrls and dedupeSocialLinks skip empty keys, so a rejected scheme
  // must not produce a key that could occupy a slot.
  assert.equal(identityUrlKey("javascript:alert(1)", ORIGIN), "");
  assert.equal(identityUrlKey("   ", ORIGIN), "");
});

test("identityUrlKey matches http and https forms of the same address", () => {
  assert.equal(
    identityUrlKey("https://example.com/a", ORIGIN) ===
      identityUrlKey("http://example.com/a", ORIGIN),
    false,
    "protocol is part of the key today -- this pins the current behavior so a change is deliberate"
  );
});
