"use client";

import {
  FormElement,
  getPreviewUtils,
  useFormField,
} from "@optimizely/cms-sdk/forms/react";
import { asFieldContent, fieldName, readValidators } from "../_shared/formFields";
import { FieldChrome, INPUT_CLASS, INVALID_CLASS } from "../_shared/formFieldUi";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Validators is `type: "json"`. It arrives parsed from a direct field selection
// but as a JSON string from the SDK's composition fragment; readValidators()
// accepts either.
interface OptiFormsTextareaData {
  Label?: string | null;
  Placeholder?: string | null;
  PredefinedValue?: string | null;
  SubmissionFieldName?: string | null;
  Validators?: unknown;
}

type OptiFormsTextareaProps = OptiFormsTextareaData & {
  content?: OptiFormsTextareaData;
};

export default function OptiFormsTextarea(props: OptiFormsTextareaProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const name = fieldName(data);
  const { fieldProps, isRequired, errors, showErrors, errorProps } = useFormField<HTMLTextAreaElement>({
    content: asFieldContent(data),
    name,
    validators: readValidators(data.Validators),
  });

  return (
    <FormElement content={asSdkContent(data)}>
      <FieldChrome
        component="OptiFormsTextarea"
        label={data.Label}
        htmlFor={name}
        required={isRequired}
        labelAttrs={pa("Label")}
        errors={errors}
        showErrors={showErrors}
        errorProps={errorProps}
      >
        <textarea
          {...fieldProps}
          placeholder={data.Placeholder ?? undefined}
          rows={4}
          className={`${INPUT_CLASS} resize-y ${showErrors ? INVALID_CLASS : ""}`}
        />
      </FieldChrome>
    </FormElement>
  );
}
