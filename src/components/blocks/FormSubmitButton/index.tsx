"use client";

import { useRef, useState } from "react";

interface FormSubmitButtonData {
  label?: string | null;
  __context?: any;
}

type FormSubmitButtonProps = FormSubmitButtonData & {
  content?: FormSubmitButtonData;
};

export default function FormSubmitButton(props: FormSubmitButtonProps) {
  const data = props.content ?? props;
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleClick() {
    if (status === "submitting") return;

    const section = ref.current?.closest("[data-form-submit-url]");
    const submitUrl = section?.getAttribute("data-form-submit-url") ?? "/api/form-submit";
    const successMsg =
      section?.getAttribute("data-form-success-message") ??
      "Thank you! We'll be in touch soon.";

    const container = ref.current?.closest("[data-epi-block-id]")?.parentElement ?? ref.current?.parentElement;
    if (!container) return;

    const inputs = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    );

    const payload: Record<string, string> = {};
    let valid = true;
    inputs.forEach((el) => {
      if (el.name) payload[el.name] = el.value;
      if (el.required && !el.value) valid = false;
    });

    if (!valid) {
      inputs.forEach((el) => {
        if (el.required && !el.value) el.reportValidity();
      });
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus("success");
        inputs.forEach((el) => { el.value = ""; });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div ref={ref}>
        <p className="text-base font-semibold text-brand">
          Thank you! We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "submitting"}
        className="hover-lift font-display inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand bg-gradient-brand border-none cursor-pointer disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : (data.label ?? "Submit")}
      </button>
      {status === "error" && (
        <p className="text-sm mt-3 text-error">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );
}
