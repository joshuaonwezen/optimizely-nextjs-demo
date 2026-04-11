import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { fieldName, INPUT_CLASS, FieldLabel } from "@/lib/formField";

interface FormTextInputData {
  label?: string | null;
  placeholder?: string | null;
  fieldName?: string | null;
  inputType?: string | null;
  required?: boolean | null;
}

type FormTextInputProps = FormTextInputData & {
  content?: FormTextInputData;
};

export default function FormTextInput(props: FormTextInputProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = fieldName(data.label, data.fieldName);
  const type = data.inputType ?? "text";

  return (
    <div className="max-w-2xl mx-auto px-8 py-3">
      {data.label && (
        <FieldLabel htmlFor={name} label={data.label} required={data.required} pa={pa("label")} />
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={data.placeholder ?? undefined}
        required={data.required ?? false}
        className={INPUT_CLASS}
      />
    </div>
  );
}
