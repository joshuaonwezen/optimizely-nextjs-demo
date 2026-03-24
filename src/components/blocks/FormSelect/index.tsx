import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface FormSelectData {
  label?: string | null;
  fieldName?: string | null;
  options?: string | null;
  required?: boolean | null;
  __context?: any;
}

type FormSelectProps = FormSelectData & {
  content?: FormSelectData;
};

export default function FormSelect(props: FormSelectProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = data.fieldName ?? data.label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
  const optionList = data.options?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];

  return (
    <div>
      {data.label && (
        <label
          {...pa("label")}
          htmlFor={name}
          className="block text-sm font-medium mb-2 text-on-surface"
        >
          {data.label}
          {data.required && <span className="text-error"> *</span>}
        </label>
      )}
      <select
        id={name}
        name={name}
        required={data.required ?? false}
        className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border"
      >
        <option value="">Select...</option>
        {optionList.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
