export const OPTI_FORMS_SELECTION_FRAGMENT = /* GraphQL */ `
  fragment OptiFormsSelectionFields on OptiFormsSelectionElement {
    Label
    Validators
    AllowMultipleChoices
    Items {
      label: Caption
      value: Value
      selected: Checked
    }
  }
`;
