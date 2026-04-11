export function fieldName(label?: string | null, name?: string | null): string {
  return name ?? label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
}

export const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  required?: boolean | null;
  pa?: Record<string, unknown>;
}

export function FieldLabel({ htmlFor, label, required, pa }: FieldLabelProps) {
  return (
    <label
      {...(pa ?? {})}
      htmlFor={htmlFor}
      className="block text-sm font-medium mb-2 text-on-surface"
    >
      {label}
      {required && <span className="text-error"> *</span>}
    </label>
  );
}
