"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import { identifyCustomer } from "@/lib/tracking/customer";
import { Button } from "@/components/ui/Button";
import { useIsClient } from "@/lib/useIsClient";

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
  // Before hydration the submit listener isn't attached, so a click would submit the
  // form natively and put the field values in the URL. Enable once it is.
  const hydrated = useIsClient();

  const formStarted = useRef(false);
  const formSubmitted = useRef(false);
  const formAbandoned = useRef(false);

  // Fire mb_form_start on first field interaction within the form.
  useEffect(() => {
    const scope = ref.current?.closest("form");
    if (!scope) return;
    function onFocusIn() {
      if (formStarted.current) return;
      formStarted.current = true;
      trackEvent("mb_form_start", { form: "opti_form" });
    }
    scope.addEventListener("focusin", onFocusIn);
    return () => scope.removeEventListener("focusin", onFocusIn);
  }, []);

  // Fire mb_form_abandon when the visitor leaves without submitting.
  useEffect(() => {
    function onAbandon() {
      if (!formStarted.current || formSubmitted.current || formAbandoned.current) return;
      formAbandoned.current = true;
      trackEvent("mb_form_abandon", { form: "opti_form" });
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") onAbandon();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onAbandon);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onAbandon);
    };
  }, []);

  // The container renders the <form>; the browser has already run required-field
  // validation by the time "submit" fires, so this only has to post the values.
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let submitting = false;

    async function onSubmit(event: SubmitEvent) {
      event.preventDefault();
      if (!form || submitting) return;
      submitting = true;

      const submitUrl = form.getAttribute("data-form-submit-url") ?? "/api/form-submit";
      const msg = form.getAttribute("data-form-success-message");
      if (msg) setSuccessMessage(msg);

      const payload: Record<string, string> = {};
      new FormData(form).forEach((value, key) => {
        // Multi-selects contribute one entry per selected option.
        if (typeof value === "string") payload[key] = payload[key] ? `${payload[key]},${value}` : value;
      });
      const fields = Object.keys(payload).join(",");

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
          formSubmitted.current = true;
          trackEvent("mb_form_submit", { form: "opti_form", fields, status: "success" });
          if (payload.email) {
            identifyCustomer({ email: payload.email });
          }
          form.reset();
        } else {
          setStatus("error");
          trackEvent("mb_form_submit", { form: "opti_form", fields, status: "error", httpStatus: res.status });
        }
      } catch {
        setStatus("error");
        trackEvent("mb_form_submit", { form: "opti_form", fields, status: "error" });
      } finally {
        submitting = false;
      }
    }

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [showDebug]);

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
      <Button
        type="submit"
        disabled={!hydrated || status === "submitting"}
        title={data.Tooltip ?? undefined}
        size="large"
      >
        {status === "submitting" ? "Submitting..." : (data.Label ?? "Submit")}
      </Button>
      {status === "error" && (
        <p className="text-sm mt-3 text-error">Something went wrong. Please try again.</p>
      )}
    </div>
  );
}
