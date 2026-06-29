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

interface SelectionItem {
  label?: string | null;
  value?: string | null;
  selected?: boolean | null;
}

interface OptiFormsSelectionData {
  Label?: string | null;
  Validators?: string | null;
  AllowMultiSelect?: boolean | null;
  Options?: string | null;
}

type OptiFormsSelectionProps = OptiFormsSelectionData & {
  content?: OptiFormsSelectionData;
};

function parseOptions(raw?: unknown): SelectionItem[] {
  if (!raw) return [];
  // Graph returns Options as a JSON value (array); demo mock data may pass a string.
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? (parsed as SelectionItem[]) : [];
}

export default function OptiFormsSelection(props: OptiFormsSelectionProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = slugify(data.Label);
  const required = isRequired(data.Validators);
  const items = parseOptions(data.Options);

  return (
    <div data-component="OptiFormsSelection" className="max-w-2xl mx-auto px-8 py-3">
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
      <select
        id={name}
        name={name}
        required={required}
        multiple={data.AllowMultiSelect ?? false}
        className={INPUT_CLASS}
      >
        {!data.AllowMultiSelect && <option value="">Select...</option>}
        {items.map((item, idx) => (
          <option
            key={idx}
            value={item.value ?? item.label ?? ""}
            defaultChecked={item.selected ?? false}
          >
            {item.label ?? item.value ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}
