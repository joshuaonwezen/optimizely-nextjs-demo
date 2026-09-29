// Shared by the native OptiForms field blocks.

import { getFieldName, toValidators } from "@optimizely/cms-sdk/forms/validation";
import type { Validator } from "@optimizely/cms-sdk/forms/validation";

/** Turns an editor-facing label into a form field `name`. */
export function slugify(label?: string | null): string {
  return label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
}

/**
 * The `name` a field posts under.
 *
 * The SDK's getFieldName() returns `SubmissionFieldName ?? Label` - the RAW
 * label, not a slug, so a field labelled "Full Name" would post under
 * "Full Name". Slugifying it keeps the snake_case payload that
 * /api/form-submit and the ODP `email` identifier are built on, while finally
 * honouring the Submission Field Name an editor sets (which the hand-rolled
 * version ignored entirely).
 */
export function fieldName(field: { SubmissionFieldName?: string | null; Label?: string | null }): string {
  return slugify(getFieldName(field));
}

/**
 * Reads a field's `Validators`.
 *
 * `Validators` is `type: "json"`, and a direct Graph field selection does return
 * it parsed - but the SDK's generated COMPOSITION fragment returns it as a JSON
 * string, which is how every CMS-authored form arrives. The SDK's own
 * toValidators() returns [] for anything that is not already an array, so using
 * it alone silently disables validation on exactly the forms that matter, while
 * the mock props on /demo/forms keep working. Parse first, then narrow.
 */
export function readValidators(value: unknown): Validator[] {
  if (typeof value === "string") {
    try {
      return toValidators(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return toValidators(value);
}

/**
 * useFormField wants an indexable record, because it also reads composition keys
 * off the content. The block data interfaces are closed shapes, so this is the
 * one bridge between the two rather than an `as any` at each call site.
 */
export function asFieldContent<T extends object>(data: T): T & Record<string, unknown> {
  return data as T & Record<string, unknown>;
}
