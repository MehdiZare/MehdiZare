"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { submitContact } from "@/app/contact/actions";
import { trackEvent } from "@/lib/analytics";

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  company: string;
  submittedAt: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

function createInitialFormState(): FormState {
  return {
    name: "",
    email: "",
    subject: "",
    message: "",
    company: "",
    submittedAt: String(Date.now()),
  };
}

export function ContactForm() {
  const [form, setForm] = useState<FormState>(createInitialFormState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required.";
    } else if (form.name.trim().length > 120) {
      newErrors.name = "Name must be 120 characters or fewer.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.message.trim()) {
      newErrors.message = "Message is required.";
    } else if (form.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters.";
    } else if (form.message.trim().length > 5000) {
      newErrors.message = "Message must be 5000 characters or fewer.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setStatus("submitting");

    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("email", form.email);
    formData.set("subject", form.subject);
    formData.set("message", form.message);
    formData.set("company", form.company);
    formData.set("submittedAt", form.submittedAt);

    const result = await submitContact(formData);

    if (result.success) {
      setStatus("success");
      setForm(createInitialFormState());
      trackEvent("consulting_form_submitted", {
        page: "contact",
        section: "contact_form",
      });
    } else {
      setStatus("error");
      setServerError(result.error || "Something went wrong. Please try again.");
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  if (status === "success") {
    return (
      <div className="border border-warm-gray bg-muted p-6 text-center">
        <p className="font-medium text-ink">
          Thank you for your message! I will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {status === "error" && serverError && (
        <div className="border border-red-200 bg-red-50 p-4" role="alert" aria-live="polite">
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          maxLength={120}
          className={cn(
            "mt-1 w-full border px-4 py-3 text-ink outline-none transition",
            "focus:border-ink focus:ring-1 focus:ring-ink",
            errors.name ? "border-red-400" : "border-warm-gray"
          )}
          placeholder="Your name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          maxLength={320}
          className={cn(
            "mt-1 w-full border px-4 py-3 text-ink outline-none transition",
            "focus:border-ink focus:ring-1 focus:ring-ink",
            errors.email ? "border-red-400" : "border-warm-gray"
          )}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-ink">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={form.subject}
          onChange={handleChange}
          maxLength={160}
          className={cn(
            "mt-1 w-full border border-warm-gray px-4 py-3 text-ink outline-none transition",
            "focus:border-ink focus:ring-1 focus:ring-ink"
          )}
          placeholder="What is this about?"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-ink">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={form.message}
          onChange={handleChange}
          maxLength={5000}
          className={cn(
            "mt-1 w-full resize-y border px-4 py-3 text-ink outline-none transition",
            "focus:border-ink focus:ring-1 focus:ring-ink",
            errors.message ? "border-red-400" : "border-warm-gray"
          )}
          placeholder="Your message..."
        />
        {errors.message && (
          <p className="mt-1 text-sm text-red-500">{errors.message}</p>
        )}
      </div>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor="company">Company</label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="off"
          tabIndex={-1}
          value={form.company}
          onChange={handleChange}
        />
      </div>
      <input
        type="hidden"
        name="submittedAt"
        value={form.submittedAt}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className={cn(
          "bg-ink px-8 py-3 font-medium text-paper transition",
          "hover:bg-ink/85 disabled:opacity-50"
        )}
      >
        {status === "submitting" ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
