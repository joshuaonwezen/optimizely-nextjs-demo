"use client";

import { useFormButton } from "@optimizely/cms-sdk/forms/react";
import { Button } from "@/components/ui/Button";
import { useIsClient } from "@/lib/useIsClient";

interface OptiFormsSubmitData {
  Label?: string | null;
  Tooltip?: string | null;
}

type OptiFormsSubmitProps = OptiFormsSubmitData & {
  content?: OptiFormsSubmitData;
  /** Forces the role. Optimizely Forms has one button element for all four. */
  role?: "submit" | "reset" | "next" | "previous";
};

export default function OptiFormsSubmit(props: OptiFormsSubmitProps) {
  const data = props.content ?? props;
  // Optimizely Forms has no property marking a button as step navigation, so the
  // SDK infers the role from the label: the exact words "next", "previous" and
  // "back" navigate, everything else submits.
  const { role, isSubmitting, label, buttonProps } = useFormButton(data, { role: props.role });
  // Before hydration the submit listener is not attached, so a click would submit
  // the form natively and put the field values in the URL. Enable once it is.
  const hydrated = useIsClient();

  return (
    <div data-component="OptiFormsSubmit" className="max-w-2xl mx-auto px-8 pt-4 pb-2">
      <Button
        type={buttonProps.type}
        onClick={buttonProps.onClick}
        disabled={!hydrated || buttonProps.disabled}
        title={buttonProps.title || undefined}
        variant={role === "previous" || role === "reset" ? "secondary" : "primary"}
        size="large"
      >
        {isSubmitting && role === "submit" ? "Submitting..." : label}
      </Button>
    </div>
  );
}
