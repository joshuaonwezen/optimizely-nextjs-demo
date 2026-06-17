import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

function slugify(label?: string | null): string {
  return label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
}

function isRequired(validators?: string | null): boolean {
  if (!validators) return false;
  try {
    const parsed = JSON.parse(validators);
    if (Array.isArray(parsed)) {
      return parsed.some((v: any) => v?.Type === "RequiredValidator" || v?.type === "RequiredValidator");
    }
  } catch {
    return validators.toLowerCase().includes("required");
  }
  return false;
}

interface SelectionItem {
  label?: string | null;
  value?: string | null;
  selected?: boolean | null;
}

interface OptiFormsSelectionData {
  Label?: string | null;
  Validators?: string | null;
  AllowMultipleChoices?: boolean | null;
  Items?: SelectionItem[] | null;
}

type OptiFormsSelectionProps = OptiFormsSelectionData & {
  content?: OptiFormsSelectionData;
};

export default function OptiFormsSelection(props: OptiFormsSelectionProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = slugify(data.Label);
  const required = isRequired(data.Validators);
  const items = data.Items ?? [];

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
        multiple={data.AllowMultipleChoices ?? false}
        className={INPUT_CLASS}
      >
        {!data.AllowMultipleChoices && <option value="">Select...</option>}
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
