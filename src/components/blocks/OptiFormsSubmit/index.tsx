"use client";

import { useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";

interface OptiFormsSubmitData {
  Label?: string | null;
  Tooltip?: string | null;
  showDebug?: boolean;
}

type OptiFormsSubmitProps = OptiFormsSubmitData & {
  content?: OptiFormsSubmitData;
};

interface DebugResult {
  payload: Record<string, string>;
  response: Record<string, unknown>;
  httpStatus: number;
}

export default function OptiFormsSubmit(props: OptiFormsSubmitProps) {
  const data = props.content ?? props;
  const showDebug = data.showDebug ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [successMessage, setSuccessMessage] = useState("Thank you! We'll be in touch soon.");
  const [debug, setDebug] = useState<DebugResult | null>(null);

  async function handleClick() {
    if (status === "submitting") return;

    const scope = ref.current?.closest("main") ?? document.body;
    const configEl = scope.querySelector("[data-form-submit-url]");
    const submitUrl = configEl?.getAttribute("data-form-submit-url") ?? "/api/form-submit";
    const msg = configEl?.getAttribute("data-form-success-message");
    if (msg) setSuccessMessage(msg);

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
        const responseData = await res.json().catch(() => ({}));
        if (showDebug) setDebug({ payload, response: responseData, httpStatus: res.status });
        setStatus("success");
        trackEvent("mb_form_submit", { fields: Object.keys(payload).join(","), status: "success" });
        inputs.forEach((el) => { el.value = ""; });
      } else {
        setStatus("error");
        trackEvent("mb_form_submit", { fields: Object.keys(payload).join(","), status: "error", httpStatus: res.status });
      }
    } catch {
      setStatus("error");
      trackEvent("mb_form_submit", { fields: Object.keys(payload).join(","), status: "error" });
    }
  }

  if (status === "success") {
    return (
      <div data-component="OptiFormsSubmit" ref={ref} className="max-w-2xl mx-auto px-8 pt-4 pb-2">
        <p className="text-base font-semibold text-brand">{successMessage}</p>
        {showDebug && debug && (
          <div className="mt-6 border-t border-ghost-border pt-6 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Submit output
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-on-surface mb-2">
                  POST /api/form-submit - request body
                </p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  {JSON.stringify(debug.payload, null, 2)}
                </pre>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Keys are each field&apos;s{" "}
                  <code className="bg-surface px-1 rounded font-mono">Label</code>, slugified via{" "}
                  <code className="bg-surface px-1 rounded font-mono">{"label.toLowerCase().replace(/\\s+/g, \"_\")"}</code>.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-on-surface mb-2">
                  Response - HTTP {debug.httpStatus}
                </p>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  {JSON.stringify(debug.response, null, 2)}
                </pre>
                <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                  The{" "}
                  <code className="bg-surface px-1 rounded font-mono">received</code> field is echoed
                  back by the demo route. In production, replace the{" "}
                  <code className="bg-surface px-1 rounded font-mono">console.log</code> with your CRM
                  or ODP integration.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-component="OptiFormsSubmit" ref={ref} className="max-w-2xl mx-auto px-8 pt-4 pb-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "submitting"}
        title={data.Tooltip ?? undefined}
        className="hover-lift font-display inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand bg-gradient-brand border-none cursor-pointer disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : (data.Label ?? "Submit")}
      </button>
      {status === "error" && (
        <p className="text-sm mt-3 text-error">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
