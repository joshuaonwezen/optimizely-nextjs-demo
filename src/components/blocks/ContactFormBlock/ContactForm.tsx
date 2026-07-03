"use client";

import { useState } from "react";
import { trackEvent } from "@/lib/tracking";

interface ContactFormBlockData {
  heading?: string | null;
  intro?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  submitUrl?: { default?: string | null } | null;
}

type ContactFormProps = ContactFormBlockData & {
  content?: ContactFormBlockData;
};

export default function ContactForm(props: ContactFormProps) {
  const data = props.content ?? props;
  const submitUrl = data.submitUrl?.default ?? "/api/form-submit";
  const successMessage = data.successMessage ?? "Thank you! We'll be in touch soon.";

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [values, setValues] = useState({ full_name: "", email: "", message: "" });

  function update(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    const fields = "full_name,email,message";
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        setStatus("success");
        trackEvent("mb_form_submit", { fields, status: "success" });
        setValues({ full_name: "", email: "", message: "" });
      } else {
        setStatus("error");
        trackEvent("mb_form_submit", { fields, status: "error", httpStatus: res.status });
      }
    } catch {
      setStatus("error");
      trackEvent("mb_form_submit", { fields, status: "error" });
    }
  }

  if (status === "success") {
    return (
      <section data-component="ContactFormBlock" className="py-16">
        <div className="max-w-2xl mx-auto px-8">
          <p className="text-base font-semibold text-brand">{successMessage}</p>
        </div>
      </section>
    );
  }

  return (
    <section data-component="ContactFormBlock" className="py-16">
      <div className="max-w-2xl mx-auto px-8">
        {data.heading && (
          <h2 className="font-display text-3xl font-extrabold mb-4 text-on-surface">
            {data.heading}
          </h2>
        )}
        {data.intro && (
          <p className="text-base mb-8 text-on-surface-variant">{data.intro}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="cf-full-name" className="block text-sm font-medium text-on-surface mb-2">
              Full name
            </label>
            <input
              id="cf-full-name"
              name="full_name"
              type="text"
              required
              value={values.full_name}
              onChange={update("full_name")}
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base text-on-surface focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cf-email" className="block text-sm font-medium text-on-surface mb-2">
              Email
            </label>
            <input
              id="cf-email"
              name="email"
              type="email"
              required
              value={values.email}
              onChange={update("email")}
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base text-on-surface focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cf-message" className="block text-sm font-medium text-on-surface mb-2">
              Message
            </label>
            <textarea
              id="cf-message"
              name="message"
              required
              rows={4}
              value={values.message}
              onChange={update("message")}
              className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-base text-on-surface resize-y focus:border-brand focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="hover-lift font-display inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand bg-gradient-brand border-none cursor-pointer disabled:opacity-60"
          >
            {status === "submitting" ? "Submitting..." : (data.submitLabel ?? "Submit")}
          </button>

          {status === "error" && (
            <p className="text-sm mt-3 text-error">Something went wrong. Please try again.</p>
          )}
        </form>
      </div>
    </section>
  );
}
