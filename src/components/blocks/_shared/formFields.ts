// Shared by the native OptiForms field blocks (Textbox, Textarea, Selection),
// which each carried a byte-identical copy of both helpers.

/** Turns an editor-facing label into a form field `name`. */
export function slugify(label?: string | null): string {
  return label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
}

/** True when a field's Validators carry Optimizely's RequiredValidator. */
export function isRequired(validators?: unknown): boolean {
  if (!validators) return false;
  // Graph returns Validators as a JSON value (array of validator objects); demo
  // mock data may pass a serialized string. Handle both.
  let parsed: unknown = validators;
  if (typeof validators === "string") {
    try {
      parsed = JSON.parse(validators);
    } catch {
      return validators.toLowerCase().includes("required");
    }
  }
  return (
    Array.isArray(parsed) &&
    (parsed as Array<{ Type?: unknown; type?: unknown } | null>).some(
      (v) => v?.Type === "RequiredValidator" || v?.type === "RequiredValidator"
    )
  );
}
