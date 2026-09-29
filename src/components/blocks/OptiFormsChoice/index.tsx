"use client";

import {
  FormElement,
  getPreviewUtils,
  useFormField,
} from "@optimizely/cms-sdk/forms/react";
import { getSelectionOptions } from "@optimizely/cms-sdk/forms/validation";
import { asFieldContent, fieldName, readValidators } from "../_shared/formFields";
import { FieldChrome } from "../_shared/formFieldUi";
import { asSdkContent } from "@/components/cms/sdkTypes";

interface OptiFormsChoiceData {
  Label?: string | null;
  SubmissionFieldName?: string | null;
  Validators?: unknown;
  AllowMultiSelect?: boolean | null;
  Options?: unknown;
}

type OptiFormsChoiceProps = OptiFormsChoiceData & {
  content?: OptiFormsChoiceData;
};

/**
 * OptiFormsChoiceElement: the same Options data as the selection element, drawn
 * as radios or checkboxes instead of a dropdown. AllowMultiSelect picks which.
 */
export default function OptiFormsChoice(props: OptiFormsChoiceProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const items = getSelectionOptions(data);
  const multiple = data.AllowMultiSelect ?? false;
  const preselected = items.filter((item) => item.selected).map((item) => item.value ?? item.label);

  // A radio group cannot take fieldProps: every input shares one name but needs
  // its own id and checked state, so the hook's loose parts are used instead.
  const name = fieldName(data);
  const { value, setValue, isRequired, errors, showErrors, errorProps, inputRef, onBlur } =
    useFormField({
      content: asFieldContent(data),
      name,
      validators: readValidators(data.Validators),
      defaultValue: (multiple ? preselected.join(",") : preselected[0]) ?? "",
    });

  const selected = value.split(",").filter(Boolean);

  function toggle(optionValue: string) {
    if (!multiple) return setValue(optionValue);
    const next = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : [...selected, optionValue];
    setValue(next.join(","));
  }

  return (
    <FormElement content={asSdkContent(data)}>
      <FieldChrome
        component="OptiFormsChoice"
        label={data.Label}
        htmlFor={`${name}-0`}
        required={isRequired}
        labelAttrs={pa("Label")}
        errors={errors}
        showErrors={showErrors}
        errorProps={errorProps}
      >
        <div role={multiple ? "group" : "radiogroup"} className="space-y-2">
          {items.map((item, idx) => {
            const optionValue = item.value ?? item.label ?? "";
            return (
              <label
                key={idx}
                htmlFor={`${name}-${idx}`}
                className="flex items-center gap-3 text-sm text-on-surface"
              >
                <input
                  ref={idx === 0 ? inputRef : undefined}
                  id={`${name}-${idx}`}
                  type={multiple ? "checkbox" : "radio"}
                  name={name}
                  value={optionValue}
                  checked={selected.includes(optionValue)}
                  onChange={() => toggle(optionValue)}
                  onBlur={onBlur}
                  aria-describedby={showErrors ? errorProps.id : undefined}
                  className="accent-brand"
                />
                {item.label ?? item.value ?? ""}
              </label>
            );
          })}
        </div>
      </FieldChrome>
    </FormElement>
  );
}
