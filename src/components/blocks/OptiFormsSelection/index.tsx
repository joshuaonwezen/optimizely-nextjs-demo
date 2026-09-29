"use client";

import {
  FormElement,
  getPreviewUtils,
  useFormField,
} from "@optimizely/cms-sdk/forms/react";
import { getSelectionOptions } from "@optimizely/cms-sdk/forms/validation";
import { asFieldContent, fieldName, readValidators } from "../_shared/formFields";
import { FieldChrome, INPUT_CLASS, INVALID_CLASS } from "../_shared/formFieldUi";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Validators and Options are `type: "json"`. A direct Graph field selection
// returns them parsed, but the SDK's composition fragment returns them as JSON
// STRINGS, which is how a CMS-authored form arrives. readValidators() and
// getSelectionOptions() both accept either form.
interface OptiFormsSelectionData {
  Label?: string | null;
  SubmissionFieldName?: string | null;
  Validators?: unknown;
  AllowMultiSelect?: boolean | null;
  Options?: unknown;
}

type OptiFormsSelectionProps = OptiFormsSelectionData & {
  content?: OptiFormsSelectionData;
};

export default function OptiFormsSelection(props: OptiFormsSelectionProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const items = getSelectionOptions(data);
  const multiple = data.AllowMultiSelect ?? false;
  const preselected = items.filter((item) => item.selected).map((item) => item.value ?? item.label);

  const { fieldProps, isRequired, errors, showErrors, errorProps, setValue } =
    useFormField<HTMLSelectElement>({
      content: asFieldContent(data),
      name: fieldName(data),
      validators: readValidators(data.Validators),
      defaultValue: (multiple ? preselected.join(",") : preselected[0]) ?? "",
    });

  // A multi-select reports every selected option; useFormField holds one string,
  // so they are joined for validation and split back for the control's value.
  const value = fieldProps.value;
  const selected = multiple ? value.split(",").filter(Boolean) : value;
  const labelFor = fieldProps.name;

  return (
    <FormElement content={asSdkContent(data)}>
      <FieldChrome
        component="OptiFormsSelection"
        label={data.Label}
        htmlFor={labelFor}
        required={isRequired}
        labelAttrs={pa("Label")}
        errors={errors}
        showErrors={showErrors}
        errorProps={errorProps}
      >
        <select
          {...fieldProps}
          multiple={multiple}
          value={selected}
          onChange={(event) =>
            setValue(
              multiple
                ? Array.from(event.target.selectedOptions, (option) => option.value).join(",")
                : event.target.value
            )
          }
          className={`${INPUT_CLASS} ${showErrors ? INVALID_CLASS : ""}`}
        >
          {!multiple && <option value="">Select...</option>}
          {items.map((item, idx) => (
            <option key={idx} value={item.value ?? item.label ?? ""}>
              {item.label ?? item.value ?? ""}
            </option>
          ))}
        </select>
      </FieldChrome>
    </FormElement>
  );
}
