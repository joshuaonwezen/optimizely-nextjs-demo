import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { useId } from "react";
import { isRequired, slugify } from "../_shared/formFields";
import { asSdkContent } from "@/components/cms/sdkTypes";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

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
  const { pa } = getPreviewUtils(asSdkContent(data));
  const name = slugify(data.Label);
  const required = isRequired(data.Validators);
  const items = parseOptions(data.Options);
  // Not derived from the label: two fields with the same label would share an id.
  const id = useId();
  const multiple = data.AllowMultiSelect ?? false;
  const optionValue = (item: SelectionItem) => item.value ?? item.label ?? "";
  // `selected` is applied through the <select>'s defaultValue; React ignores
  // per-<option> defaults.
  const selectedValues = items.filter((item) => item.selected).map(optionValue);
  const defaultValue = multiple ? selectedValues : (selectedValues[0] ?? "");

  return (
    <div data-component="OptiFormsSelection" className="max-w-2xl mx-auto px-8 py-3">
      {data.Label && (
        <label
          {...pa("Label")}
          htmlFor={id}
          className="block text-sm font-medium mb-2 text-on-surface"
        >
          {data.Label}
          {required && <span className="text-error"> *</span>}
        </label>
      )}
      <select
        id={id}
        name={name}
        required={required}
        multiple={multiple}
        defaultValue={defaultValue}
        className={INPUT_CLASS}
      >
        {!multiple && <option value="">Select...</option>}
        {items.map((item, idx) => (
          <option key={idx} value={optionValue(item)}>
            {item.label ?? item.value ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}
