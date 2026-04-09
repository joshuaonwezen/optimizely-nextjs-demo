import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface FormTextInputData {
  label?: string | null;
  placeholder?: string | null;
  fieldName?: string | null;
  inputType?: string | null;
  required?: boolean | null;
  __context?: any;
}

type FormTextInputProps = FormTextInputData & {
  content?: FormTextInputData;
};

export default function FormTextInput(props: FormTextInputProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = data.fieldName ?? data.label?.toLowerCase().replace(/\s+/g, "_") ?? "field";
  const type = data.inputType ?? "text";

  return (
    <div {...pa((data as any).__composition)}>
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
      <input
        id={name}
        name={name}
        type={type}
        placeholder={data.placeholder ?? undefined}
        required={data.required ?? false}
        className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border"
      />
    </div>
  );
}
