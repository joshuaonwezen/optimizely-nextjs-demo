import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface FormTextAreaData {
  label?: string | null;
  placeholder?: string | null;
  fieldName?: string | null;
  required?: boolean | null;
  __context?: any;
}

type FormTextAreaProps = FormTextAreaData & {
  content?: FormTextAreaData;
};

export default function FormTextArea(props: FormTextAreaProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = data.fieldName ?? data.label?.toLowerCase().replace(/\s+/g, "_") ?? "field";

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
      <textarea
        id={name}
        name={name}
        placeholder={data.placeholder ?? undefined}
        required={data.required ?? false}
        rows={4}
        className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 resize-y bg-surface-lowest text-on-surface border border-ghost-border"
      />
    </div>
  );
}
