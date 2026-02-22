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
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState("");

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!form.message.trim()) {
      newErrors.message = "Message is required.";
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

    const result = await submitContact(formData);

    if (result.success) {
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
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
        <div className="border border-red-200 bg-red-50 p-4">
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
