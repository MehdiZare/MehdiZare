"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { submitContact } from "@/app/contact/actions";

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
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <p className="font-medium text-green-800">
          Thank you for your message! I will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {status === "error" && serverError && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-600">{serverError}</p>
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={form.name}
          onChange={handleChange}
          className={cn(
            "mt-1 w-full rounded-lg border px-4 py-3 text-gray-900 outline-none transition",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            errors.name ? "border-red-400" : "border-gray-300"
          )}
          placeholder="Your name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className={cn(
            "mt-1 w-full rounded-lg border px-4 py-3 text-gray-900 outline-none transition",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            errors.email ? "border-red-400" : "border-gray-300"
          )}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Subject */}
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          value={form.subject}
          onChange={handleChange}
          className={cn(
            "mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition",
            "focus:border-primary focus:ring-1 focus:ring-primary"
          )}
          placeholder="What is this about?"
        />
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={form.message}
          onChange={handleChange}
          className={cn(
            "mt-1 w-full resize-y rounded-lg border px-4 py-3 text-gray-900 outline-none transition",
            "focus:border-primary focus:ring-1 focus:ring-primary",
            errors.message ? "border-red-400" : "border-gray-300"
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
          "rounded-lg bg-primary px-8 py-3 font-medium text-white transition",
          "hover:bg-teal-800 disabled:opacity-50"
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
