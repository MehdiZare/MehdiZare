"use server";

import { createHash } from "node:crypto";
import { submitContactForm } from "@/lib/strapi";
import { validateContactFormData } from "@/lib/contact-validation";

interface ActionResult {
  success: boolean;
  error?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 3;

const globalRateLimitStore = globalThis as typeof globalThis & {
  __contactSubmissionRateLimit?: Map<string, RateLimitEntry>;
};

if (!globalRateLimitStore.__contactSubmissionRateLimit) {
  globalRateLimitStore.__contactSubmissionRateLimit = new Map();
}

const rateLimitStore = globalRateLimitStore.__contactSubmissionRateLimit;

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function consumeRateLimit(email: string, nowMs: number): boolean {
  if (rateLimitStore.size > 500) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= nowMs) {
        rateLimitStore.delete(key);
      }
    }
  }

  const key = hashIdentifier(email.toLowerCase());
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= nowMs) {
    rateLimitStore.set(key, { count: 1, resetAt: nowMs + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return true;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown_error";
}

export async function submitContact(formData: FormData): Promise<ActionResult> {
  const validation = validateContactFormData(formData);
  if (!validation.ok) {
    if (validation.reason === "bot") {
      return { success: true };
    }
    return { success: false, error: validation.error };
  }

  const now = Date.now();
  if (!consumeRateLimit(validation.data.email, now)) {
    return {
      success: false,
      error: "Too many submissions. Please wait a few minutes and try again.",
    };
  }

  try {
    await submitContactForm(validation.data);

    return { success: true };
  } catch (error) {
    console.error("Failed to submit contact form", {
      at: new Date(now).toISOString(),
      emailHash: hashIdentifier(validation.data.email),
      error: safeErrorMessage(error),
    });
    return {
      success: false,
      error:
        "Unable to send your message right now. Please email me directly at mehdi@mehdizare.com.",
    };
  }
}
