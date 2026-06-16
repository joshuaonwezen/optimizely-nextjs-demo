import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { fieldName, INPUT_CLASS, FieldLabel } from "@/lib/formField";

export const FormTextAreaType = contentType({
  key: "FormTextArea",
  displayName: "Text Area",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label",       isLocalized: true },
    placeholder: { type: "string", displayName: "Placeholder", isLocalized: true },
    fieldName: { type: "string", displayName: "Field Name" },
    required: { type: "boolean", displayName: "Required" },
  },
});

interface FormTextAreaData {
  label?: string | null;
  placeholder?: string | null;
  fieldName?: string | null;
  required?: boolean | null;
}

type FormTextAreaProps = FormTextAreaData & {
  content?: FormTextAreaData;
};

export default function FormTextArea(props: FormTextAreaProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = fieldName(data.label, data.fieldName);

  return (
    <div data-component="FormTextArea" className="max-w-2xl mx-auto px-8 py-3">
      {data.label && (
        <FieldLabel htmlFor={name} label={data.label} required={data.required} pa={pa("label")} />
      )}
      <textarea
        id={name}
        name={name}
        placeholder={data.placeholder ?? undefined}
        required={data.required ?? false}
        rows={4}
        className={`${INPUT_CLASS} resize-y`}
      />
    </div>
  );
}
