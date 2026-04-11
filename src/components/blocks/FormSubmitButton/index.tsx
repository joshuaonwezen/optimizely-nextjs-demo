"use client";

import { useRef, useState } from "react";

interface FormSubmitButtonData {
  label?: string | null;
}

type FormSubmitButtonProps = FormSubmitButtonData & {
  content?: FormSubmitButtonData;
  displaySettings?: Record<string, string | boolean>;
};

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function FormSubmitButton(props: FormSubmitButtonProps) {
  const data = props.content ?? props;
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const alignment = ALIGN_CLASS[String(props.displaySettings?.alignment ?? "left")] ?? "text-left";
  const isOutline = props.displaySettings?.variant === "outline";

  async function handleClick() {
    if (status === "submitting") return;

    // Find the form config and inputs within the nearest <main> (or body as fallback).
    // In Visual Builder compositions, the FormContainerBlock and form fields
    // render as flat siblings — closest() won't work across sibling boundaries.
    const scope = ref.current?.closest("main") ?? document.body;
    const configEl = scope.querySelector("[data-form-submit-url]");
    const submitUrl = configEl?.getAttribute("data-form-submit-url") ?? "/api/form-submit";

    // Collect all form inputs within the page scope
    const inputs = scope.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
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
      <div ref={ref} className={`max-w-2xl mx-auto px-8 pt-4 pb-2 ${alignment}`}>
        <p className="text-base font-semibold text-brand">
          Thank you! We&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  const btnClass = isOutline
    ? "hover-lift font-display inline-block px-10 py-4 rounded-lg font-semibold text-base text-brand border-2 border-brand bg-transparent cursor-pointer disabled:opacity-60"
    : "hover-lift font-display inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand bg-gradient-brand border-none cursor-pointer disabled:opacity-60";

  return (
    <div ref={ref} className={`max-w-2xl mx-auto px-8 pt-4 pb-2 ${alignment}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "submitting"}
        className={btnClass}
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
