"use client";

import {
  FormElement,
  getPreviewUtils,
  useFormField,
} from "@optimizely/cms-sdk/forms/react";
import { getHtmlValidationAttributes } from "@optimizely/cms-sdk/forms/validation";
import { asFieldContent, fieldName, readValidators } from "../_shared/formFields";
import { FieldChrome, INPUT_CLASS, INVALID_CLASS } from "../_shared/formFieldUi";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Validators is `type: "json"`. It arrives parsed from a direct field selection
// but as a JSON string from the SDK's composition fragment; readValidators()
// accepts either. AutoComplete is a string holding an HTML autocomplete token.
export interface OptiFormsTextboxData {
  Label?: string | null;
  Placeholder?: string | null;
  AutoComplete?: string | boolean | null;
  PredefinedValue?: string | null;
  SubmissionFieldName?: string | null;
  Validators?: unknown;
}

type OptiFormsTextboxProps = OptiFormsTextboxData & {
  content?: OptiFormsTextboxData;
  /** Overrides the input type for the Number, Range and Url element variants. */
  inputType?: string;
};

export default function OptiFormsTextbox(props: OptiFormsTextboxProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const validators = readValidators(data.Validators);
  // useFormField sets fieldProps.id to the name, so the label can point at it
  // without reading back through the returned object.
  const name = fieldName(data);
  const { fieldProps, isRequired, errors, showErrors, errorProps } = useFormField({
    content: asFieldContent(data),
    name,
    validators,
  });

  // getHtmlValidationAttributes turns an EmailValidator into type="email" and a
  // RegularExpressionValidator into a pattern, so the browser enforces what the
  // editor configured. An explicit inputType (Number, Range, Url) wins over it.
  const { type: validatedType, ...validationAttrs } = getHtmlValidationAttributes(validators);
  const type =
    props.inputType ?? (typeof validatedType === "string" ? validatedType : "text");

  // The SDK's schema types AutoComplete as a string, which the CMS fills with an HTML
  // autocomplete token ("email", "tel", ...). Pass a token straight through; fall back
  // to the on/off reading for the boolean the hand-rolled schema used to declare.
  const autoComplete =
    typeof data.AutoComplete === "string" && data.AutoComplete
      ? data.AutoComplete
      : data.AutoComplete
        ? "on"
        : "off";

  return (
    <FormElement content={asSdkContent(data)}>
      <FieldChrome
        component="OptiFormsTextbox"
        label={data.Label}
        htmlFor={name}
        required={isRequired}
        labelAttrs={pa("Label")}
        errors={errors}
        showErrors={showErrors}
        errorProps={errorProps}
      >
        <input
          {...fieldProps}
          {...validationAttrs}
          type={type}
          placeholder={data.Placeholder ?? undefined}
          autoComplete={autoComplete}
          className={`${INPUT_CLASS} ${showErrors ? INVALID_CLASS : ""}`}
        />
      </FieldChrome>
    </FormElement>
  );
}
