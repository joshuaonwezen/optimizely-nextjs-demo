import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { useId } from "react";
import { isRequired, slugify } from "../_shared/formFields";

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-lg text-sm outline-none transition-shadow focus:ring-2 focus:ring-brand/30 bg-surface-lowest text-on-surface border border-ghost-border";

interface OptiFormsTextboxData {
  Label?: string | null;
  Placeholder?: string | null;
  AutoComplete?: boolean | null;
  PredefinedValue?: string | null;
  Validators?: string | null;
}

type OptiFormsTextboxProps = OptiFormsTextboxData & {
  content?: OptiFormsTextboxData;
};

export default function OptiFormsTextbox(props: OptiFormsTextboxProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const name = slugify(data.Label);
  // Not derived from the label: two fields with the same label would share an id.
  const id = useId();
  const required = isRequired(data.Validators);

  return (
    <div data-component="OptiFormsTextbox" className="max-w-2xl mx-auto px-8 py-3">
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
      <input
        id={id}
        name={name}
        type="text"
        placeholder={data.Placeholder ?? undefined}
        defaultValue={data.PredefinedValue ?? undefined}
        autoComplete={data.AutoComplete ? "on" : "off"}
        required={required}
        className={INPUT_CLASS}
      />
    </div>
  );
}
