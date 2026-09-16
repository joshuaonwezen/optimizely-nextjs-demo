import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { useId } from "react";
import { isRequired, slugify } from "../_shared/formFields";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

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
  // Not derived from the label: two fields with the same label would share an id.
  const id = useId();
  const required = isRequired(data.Validators);

  return (
    <div data-component="OptiFormsTextarea" className="max-w-2xl mx-auto px-8 py-3">
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
      <textarea
        id={id}
        name={name}
        placeholder={data.Placeholder ?? undefined}
        required={required}
        rows={4}
        className={`${INPUT_CLASS} resize-y`}
      />
    </div>
  );
}
