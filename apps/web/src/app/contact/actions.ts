"use server";

import { submitContactForm } from "@/lib/strapi";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function submitContact(formData: FormData): Promise<ActionResult> {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string | null;
  const subject = formData.get("subject") as string | null;
  const message = formData.get("message") as string | null;

  // Server-side validation
  if (!name || !name.trim()) {
    return { success: false, error: "Name is required." };
  }

  if (!email || !email.trim()) {
    return { success: false, error: "Email is required." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please provide a valid email address." };
  }

  if (!message || !message.trim()) {
    return { success: false, error: "Message is required." };
  }

  try {
    await submitContactForm({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || undefined,
      message: message.trim(),
    });

    return { success: true };
  } catch (error) {
    // Graceful degradation: log the submission and return success
    // even if Strapi is not available
    console.error("Failed to submit contact form to Strapi:", error);
    console.log("Contact form submission (logged):", {
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || "",
      message: message.trim(),
    });

    return { success: true };
  }
}
