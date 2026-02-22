const NAME_MAX_LENGTH = 120;
const EMAIL_MAX_LENGTH = 320;
const SUBJECT_MAX_LENGTH = 160;
const MESSAGE_MAX_LENGTH = 5_000;
const MESSAGE_MIN_LENGTH = 10;

const MIN_FORM_FILL_MS = 2_000;
const MAX_FORM_AGE_MS = 4 * 60 * 60 * 1_000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactValidationOptions {
  nowMs?: number;
}

export interface ValidatedContactSubmission {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export type ContactValidationResult =
  | {
      ok: true;
      data: ValidatedContactSubmission;
    }
  | {
      ok: false;
      reason: "invalid" | "bot";
      error: string;
    };

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

function readString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw : "";
}

function tooManyLinks(message: string): boolean {
  const linkMatches = message.match(/https?:\/\//gi);
  return (linkMatches?.length ?? 0) > 5;
}

export function validateContactFormData(
  formData: FormData,
  options?: ContactValidationOptions
): ContactValidationResult {
  const nowMs = options?.nowMs ?? Date.now();

  const honeypot = readString(formData, "company");
  if (honeypot.trim()) {
    return {
      ok: false,
      reason: "bot",
      error: "Bot-like submission detected.",
    };
  }

  const submittedAtRaw = readString(formData, "submittedAt");
  const submittedAt = Number(submittedAtRaw);
  if (!Number.isFinite(submittedAt)) {
    return {
      ok: false,
      reason: "invalid",
      error: "Invalid form metadata.",
    };
  }

  const elapsedMs = nowMs - submittedAt;
  if (elapsedMs < MIN_FORM_FILL_MS) {
    return {
      ok: false,
      reason: "bot",
      error: "Please take a moment before submitting.",
    };
  }

  if (elapsedMs > MAX_FORM_AGE_MS) {
    return {
      ok: false,
      reason: "invalid",
      error: "Your session expired. Please refresh and try again.",
    };
  }

  const name = normalizeText(readString(formData, "name"));
  const email = normalizeText(readString(formData, "email")).toLowerCase();
  const subject = normalizeText(readString(formData, "subject"));
  const message = normalizeMultilineText(readString(formData, "message"));

  if (!name) {
    return { ok: false, reason: "invalid", error: "Name is required." };
  }
  if (name.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      reason: "invalid",
      error: `Name must be ${NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!email) {
    return { ok: false, reason: "invalid", error: "Email is required." };
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    return {
      ok: false,
      reason: "invalid",
      error: "Please provide a valid email address.",
    };
  }

  if (subject.length > SUBJECT_MAX_LENGTH) {
    return {
      ok: false,
      reason: "invalid",
      error: `Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!message) {
    return { ok: false, reason: "invalid", error: "Message is required." };
  }
  if (message.length < MESSAGE_MIN_LENGTH) {
    return {
      ok: false,
      reason: "invalid",
      error: `Message must be at least ${MESSAGE_MIN_LENGTH} characters.`,
    };
  }
  if (message.length > MESSAGE_MAX_LENGTH) {
    return {
      ok: false,
      reason: "invalid",
      error: `Message must be ${MESSAGE_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (tooManyLinks(message)) {
    return {
      ok: false,
      reason: "invalid",
      error: "Message contains too many links.",
    };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      subject: subject || undefined,
      message,
    },
  };
}

export const contactValidationLimits = {
  minFormFillMs: MIN_FORM_FILL_MS,
  maxFormAgeMs: MAX_FORM_AGE_MS,
  nameMaxLength: NAME_MAX_LENGTH,
  emailMaxLength: EMAIL_MAX_LENGTH,
  subjectMaxLength: SUBJECT_MAX_LENGTH,
  messageMinLength: MESSAGE_MIN_LENGTH,
  messageMaxLength: MESSAGE_MAX_LENGTH,
} as const;
