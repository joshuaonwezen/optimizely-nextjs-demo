"use client";

import OptiFormsSubmit from "../OptiFormsSubmit";

interface OptiFormsResetData {
  Label?: string | null;
  Tooltip?: string | null;
}

type OptiFormsResetProps = OptiFormsResetData & {
  content?: OptiFormsResetData;
};

/**
 * OptiFormsResetElement. The same button element as submit, but the role cannot
 * be inferred from the label (getFormButtonRole only recognises next / previous /
 * back), so it is passed explicitly. FormWrapper's onReset clears the fields and
 * returns to the first step.
 */
export default function OptiFormsReset(props: OptiFormsResetProps) {
  return <OptiFormsSubmit {...props} role="reset" />;
}
