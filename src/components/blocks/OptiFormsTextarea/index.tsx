import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

function slugify(label?: string | null): string {
  return label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
}

function isRequired(validators?: unknown): boolean {
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
    parsed.some((v: any) => v?.Type === "RequiredValidator" || v?.type === "RequiredValidator")
  );
}

interface OptiFormsTextareaData {
  Label?: string | null;
  Placeholder?: string | null;
  Validators?: string | null;
}

type OptiFormsTextareaProps = OptiFormsTextareaData & {
  content?: OptiFormsTextareaData;
};

export default function OptiFormsTextarea(props: OptiFormsTextareaProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = slugify(data.Label);
  const required = isRequired(data.Validators);

  return (
    <div data-component="OptiFormsTextarea" className="max-w-2xl mx-auto px-8 py-3">
      {data.Label && (
        <label
          {...pa("Label")}
          htmlFor={name}
          className="block text-sm font-medium mb-2 text-on-surface"
        >
          {data.Label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        placeholder={data.Placeholder ?? undefined}
        required={required}
        rows={4}
        className={`${INPUT_CLASS} resize-y`}
      />
    </div>
  );
}
