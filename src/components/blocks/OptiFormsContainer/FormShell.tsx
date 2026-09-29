"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  FormSubmissionProvider,
  FormWrapper,
  useFormSubmission,
} from "@optimizely/cms-sdk/forms/react";
import { trackEvent } from "@/lib/tracking";
import { getVisitorId } from "@/lib/tracking/cookies";
import { identifyCustomer } from "@/lib/tracking/customer";

/** FormWrapper's own step and rule types, without reaching into the SDK's internals. */
type FormWrapperProps = ComponentProps<typeof FormWrapper>;
export type FormSteps = NonNullable<FormWrapperProps["steps"]>;

interface DebugResult {
  request: unknown;
  response: Record<string, unknown>;
  httpStatus: number;
}

export interface FormShellProps {
  /** The container's Submit URL. Becomes the FormWrapper `action`. */
  action: string;
  successMessage: string;
  /** Content key of the form container, echoed to the endpoint as `formKey`. */
  formKey?: string;
  /** Step nodes, so FormWrapper can resolve dependency-rule jump targets. */
  steps?: FormSteps;
  /** The container's DependencyRules, forwarded to FormRulesProvider. */
  rules?: unknown;
  /** Renders the request/response panel after a successful submit (/demo/forms). */
  showDebug?: boolean;
  children: ReactNode;
}

/**
 * Client half of OptiFormsContainer.
 *
 * FormWrapper calls useFormSubmission() but does NOT render
 * FormSubmissionProvider itself - it only wraps its children in the validation
 * and rules providers. Leaving the provider out throws at render time, so this
 * shell supplies it.
 */
export default function FormShell(props: FormShellProps) {
  return (
    <FormSubmissionProvider>
      <FormBody {...props} />
    </FormSubmissionProvider>
  );
}

function FormBody({
  action,
  successMessage,
  formKey,
  steps,
  rules,
  showDebug = false,
  children,
}: FormShellProps) {
  const [debug, setDebug] = useState<DebugResult | null>(null);
  const { formSuccess, errorMessage } = useFormSubmission();

  // This is createJsonSubmitHandler's envelope, posted by hand. The SDK helper
  // is the right default in an ordinary app, but it discards the response, and
  // the /demo/forms debug panel exists to show the real one. Resolving means
  // success and throwing means failure - that contract is what FormWrapper reads.
  const submitHandler = useCallback(
    async (formData: FormData, context: { action: string }) => {
      const payload: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value !== "string") return;
        // A multi-select contributes one entry per selected option.
        payload[key] = payload[key] ? `${payload[key]},${value}` : value;
      });

      // Captured before the visitor id goes in, so mb_form_submit reports the
      // fields the visitor actually filled rather than an internal identifier.
      const fields = Object.keys(payload).join(",");

      // /api/form-submit uses fs_user_id as an ODP identifier when it is present,
      // and nothing was ever sending it - so a submission from a visitor who is
      // not yet known by email reached ODP with no identifier at all and stitched
      // to nobody. OdpSetup files the FX visitor id under fs_user_id. The route
      // strips it back out of the event's data before forwarding.
      payload.fs_user_id = getVisitorId();

      const request = { targetUrl: context.action, payload, formKey: formKey ?? "" };
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        throw new Error(`Submission failed with status ${res.status}`);
      }

      const response = await res.json().catch(() => ({}));
      trackEvent("mb_form_submit", {
        form: "opti_form",
        fields,
        status: "success",
      });
      if (payload.email) identifyCustomer({ email: payload.email });
      if (showDebug) setDebug({ request, response, httpStatus: res.status });
    },
    [action, formKey, showDebug]
  );

  return (
    <FormWrapper action={action} submitHandler={submitHandler} steps={steps} rules={rules}>
      <FormTracking />
      {formSuccess ? (
        <SuccessPanel message={successMessage} debug={showDebug ? debug : null} />
      ) : (
        children
      )}
      {errorMessage && (
        <p className="max-w-2xl mx-auto px-8 text-sm text-error" role="alert">
          {errorMessage}
        </p>
      )}
    </FormWrapper>
  );
}

/**
 * mb_form_start / mb_form_abandon, scoped to this form. FormWrapper owns the
 * <form> and forwards no ref, so the listener is attached via closest("form").
 */
function FormTracking() {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const abandoned = useRef(false);
  const { formSuccess } = useFormSubmission();
  const succeeded = useRef(false);

  useEffect(() => {
    succeeded.current = formSuccess;
  }, [formSuccess]);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    function onFocusIn() {
      if (started.current) return;
      started.current = true;
      trackEvent("mb_form_start", { form: "opti_form" });
    }
    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, []);

  useEffect(() => {
    function onAbandon() {
      if (!started.current || succeeded.current || abandoned.current) return;
      abandoned.current = true;
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

  return <span ref={ref} hidden />;
}

// id="form-alert" is FormWrapper's default scrollToOnSuccess target.
function SuccessPanel({ message, debug }: { message: string; debug: DebugResult | null }) {
  return (
    <div id="form-alert" className="max-w-2xl mx-auto px-8 pt-4 pb-2">
      <p className="text-base font-semibold text-brand">{message}</p>
      {debug && (
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
                {JSON.stringify(debug.request, null, 2)}
              </pre>
              <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                The SDK envelope is{" "}
                <code className="bg-surface px-1 rounded font-mono">
                  {"{ targetUrl, payload, formKey }"}
                </code>
                . Payload keys come from{" "}
                <code className="bg-surface px-1 rounded font-mono">
                  slugify(getFieldName(field))
                </code>
                , so an editor&apos;s Submission Field Name wins over the label.
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
                The route unwraps the envelope, logs the payload and forwards it to ODP as a{" "}
                <code className="bg-surface px-1 rounded font-mono">form_submit</code> event.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
