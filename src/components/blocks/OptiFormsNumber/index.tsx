"use client";

import OptiFormsTextbox, { type OptiFormsTextboxData } from "../OptiFormsTextbox";

type OptiFormsNumberProps = OptiFormsTextboxData & {
  content?: OptiFormsTextboxData;
};

/**
 * OptiFormsNumberElement. Identical to the textbox apart from the input type, so
 * it reuses it rather than repeating the validation and preview wiring.
 * OptiFormsRangeElement maps here too - the CMS models both as a numeric field,
 * and a range with no Min/Max would render as an unusable 0-100 slider.
 */
export default function OptiFormsNumber(props: OptiFormsNumberProps) {
  return <OptiFormsTextbox {...props} inputType="number" />;
}
