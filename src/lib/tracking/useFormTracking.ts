"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { trackEvent } from "./index";

export function useFormTracking(formName: string): {
  formRef: RefObject<HTMLFormElement | null>;
  trackSubmit: (
    fields: string,
    status: "success" | "error",
    extra?: Record<string, string | number | boolean>
  ) => void;
} {
  const formRef = useRef<HTMLFormElement>(null);
  const started = useRef(false);
  const submitted = useRef(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function onFocusIn() {
      if (started.current) return;
      started.current = true;
      trackEvent("mb_form_start", { form: formName });
    }
    form.addEventListener("focusin", onFocusIn);
    return () => form.removeEventListener("focusin", onFocusIn);
  }, [formName]);

  useEffect(() => {
    function onAbandon() {
      if (!started.current || submitted.current) return;
      trackEvent("mb_form_abandon", { form: formName });
    }
    // visibilitychange fires when the tab goes to background; beforeunload
    // fires on navigation away or tab close. Both are reasonable abandonment
    // signals — fire once, don't spam.
    function onVisibility() {
      if (document.visibilityState === "hidden") onAbandon();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onAbandon);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onAbandon);
    };
  }, [formName]);

  function trackSubmit(
    fields: string,
    status: "success" | "error",
    extra?: Record<string, string | number | boolean>
  ) {
    submitted.current = true;
    trackEvent("mb_form_submit", { form: formName, fields, status, ...extra });
  }

  return { formRef, trackSubmit };
}
