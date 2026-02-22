import test from "node:test";
import assert from "node:assert/strict";
const {
  contactValidationLimits,
  validateContactFormData,
} = await import("../src/lib/contact-validation.ts");

function buildValidFormData(submittedAt: number): FormData {
  const formData = new FormData();
  formData.set("name", "Mehdi Zare");
  formData.set("email", "mehdi@example.com");
  formData.set("subject", "Consulting");
  formData.set(
    "message",
    "I need help shipping an AI product from prototype to production."
  );
  formData.set("company", "");
  formData.set("submittedAt", String(submittedAt));
  return formData;
}

test("valid contact form data passes validation", () => {
  const now = Date.now();
  const formData = buildValidFormData(now - contactValidationLimits.minFormFillMs - 500);
  const result = validateContactFormData(formData, { nowMs: now });
  assert.equal(result.ok, true);
});

test("bot honeypot input is rejected", () => {
  const now = Date.now();
  const formData = buildValidFormData(now - contactValidationLimits.minFormFillMs - 500);
  formData.set("company", "spam");
  const result = validateContactFormData(formData, { nowMs: now });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "bot");
  }
});

test("submissions that are too fast are rejected", () => {
  const now = Date.now();
  const formData = buildValidFormData(now - 250);
  const result = validateContactFormData(formData, { nowMs: now });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "bot");
  }
});

test("invalid email is rejected", () => {
  const now = Date.now();
  const formData = buildValidFormData(now - contactValidationLimits.minFormFillMs - 500);
  formData.set("email", "invalid-email");
  const result = validateContactFormData(formData, { nowMs: now });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "invalid");
  }
});
