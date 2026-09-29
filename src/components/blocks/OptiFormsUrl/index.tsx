"use client";

import OptiFormsTextbox, { type OptiFormsTextboxData } from "../OptiFormsTextbox";

type OptiFormsUrlProps = OptiFormsTextboxData & {
  content?: OptiFormsTextboxData;
};

/** OptiFormsUrlElement. A textbox with the browser's own URL validation. */
export default function OptiFormsUrl(props: OptiFormsUrlProps) {
  return <OptiFormsTextbox {...props} inputType="url" />;
}
