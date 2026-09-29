"use client";

import type { ReactNode } from "react";

export const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

export const INVALID_CLASS = "border-error focus:ring-error/30";

interface FieldChromeProps {
  component: string;
  label?: string | null;
  /** The input's id, which useFormField sets to the field name. */
  htmlFor: string;
  required: boolean;
  /** Preview attributes for the Label property, so the CMS overlay can target it. */
  labelAttrs?: Record<string, unknown>;
  errors: string[];
  showErrors: boolean;
  errorProps: { id: string; role: string };
  children: ReactNode;
}

/**
 * Label, required marker and validation messages around one field. The control
 * itself is the caller's, because only it knows which element to render.
 */
export function FieldChrome({
  component,
  label,
  htmlFor,
  required,
  labelAttrs,
  errors,
  showErrors,
  errorProps,
  children,
}: FieldChromeProps) {
  return (
    <div data-component={component} className="max-w-2xl mx-auto px-8 py-3">
      {label && (
        <label
          {...labelAttrs}
          htmlFor={htmlFor}
          className="block text-sm font-medium mb-2 text-on-surface"
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      {children}
      {showErrors && (
        <p {...errorProps} className="mt-2 text-xs text-error">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
