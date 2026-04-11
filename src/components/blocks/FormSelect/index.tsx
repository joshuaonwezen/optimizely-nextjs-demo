import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { fieldName, INPUT_CLASS, FieldLabel } from "@/lib/formField";

interface FormSelectData {
  label?: string | null;
  fieldName?: string | null;
  options?: string | null;
  required?: boolean | null;
}

type FormSelectProps = FormSelectData & {
  content?: FormSelectData;
};

export default function FormSelect(props: FormSelectProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = fieldName(data.label, data.fieldName);
  const optionList = data.options?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];

  return (
    <div className="max-w-2xl mx-auto px-8 py-3">
      {data.label && (
        <FieldLabel htmlFor={name} label={data.label} required={data.required} pa={pa("label")} />
      )}
      <select
        id={name}
        name={name}
        required={data.required ?? false}
        className={INPUT_CLASS}
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
