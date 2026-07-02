import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, HEADING_SIZE, TEXT_ALIGN,
  BG_CLASSES, HEADING_CLASSES, TEXT_ALIGN_CLASSES,
} from "../_shared/displayTemplateSettings";

export const OutcomeItemBlockType = contentType({
  key: "OutcomeItemBlock",
  displayName: "Outcome Stat",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    stat:   { type: "string", displayName: "Stat (e.g. 42, 3.5)" },
    suffix: { type: "string", displayName: "Suffix (e.g. %, x, M)", isLocalized: true },
    label:  { type: "string", displayName: "Label",                  isLocalized: true },
  },
});

export const OutcomeItemInlineTemplate = displayTemplate({
  key: "OutcomeItemInlineTemplate",
  isDefault: false,
  displayName: "Inline stat (number and label side by side)",
  contentType: "OutcomeItemBlock",
  tag: "Inline",
  settings: {
    ...HEADING_SIZE,
    ...BACKGROUND,
    ...TEXT_ALIGN,
  },
});

export const OutcomeItemBrandTemplate = displayTemplate({
  key: "OutcomeItemBrandTemplate",
  isDefault: false,
  displayName: "Boxed stat",
  contentType: "OutcomeItemBlock",
  tag: "Brand",
  settings: {
    ...BACKGROUND,
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
  },
});

interface OutcomeData {
  stat?:   string | null;
  suffix?: string | null;
  label?:  string | null;
  __context?: { edit?: boolean } | null;
}

type OutcomeItemBlockProps = OutcomeData & {
  content?: OutcomeData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function OutcomeItemBlock(props: OutcomeItemBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  if (!data.stat && !data.label) return null;

  const isInline = props.displayTemplateKey === "OutcomeItemInlineTemplate";
  const isBrand = props.displayTemplateKey === "OutcomeItemBrandTemplate";

  if (isInline) {
    const headingSizeKey = (ds?.headingSize as string) ?? "xl";
    const statClass = HEADING_CLASSES[headingSizeKey];
    const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
    const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";
    const bgKey = (ds?.background as string) || "transparent";
    const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.transparent;
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "left"];
    return (
      <div data-component="OutcomeItemBlock" className={`flex items-baseline gap-3 ${alignClass} ${bg.wrapper ? `${bg.wrapper} rounded-xl p-4` : ""}`}>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          {data.stat && (
            <span {...pa("stat")} className={`font-display ${statClass} font-extrabold ${bg.text || "text-brand"}`}>
              {data.stat}
            </span>
          )}
          {data.suffix && (
            <span {...pa("suffix")} className={`font-display ${suffixClass} font-bold ${bg.text || "text-brand"}`}>
              {data.suffix}
            </span>
          )}
        </div>
        {data.label && (
          <p {...pa("label")} className={`text-sm ${bg.textMuted || "text-on-surface-variant"}`}>
            {data.label}
          </p>
        )}
      </div>
    );
  }

  const bgKey = (ds?.background as string) || (isBrand ? "blueGrad" : "transparent");
  const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.transparent;

  const headingSizeKey = (ds?.headingSize as string) ?? "xl";
  const statClass = HEADING_CLASSES[headingSizeKey];
  const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
  const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";

  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "center"];
  const wrapperClass = isBrand
    ? `${alignClass} p-8 rounded-xl ${bg.wrapper}`
    : `${alignClass} px-6 py-4`;

  return (
    <div data-component="OutcomeItemBlock" className={wrapperClass}>
      <div className={`flex items-baseline gap-1 ${ds?.textAlign === "center" || !ds?.textAlign ? "justify-center" : ds?.textAlign === "right" ? "justify-end" : "justify-start"}`}>
        {data.stat && (
          <span
            {...pa("stat")}
            className={`font-display ${statClass} font-extrabold ${bg.text || "text-brand"}`}
          >
            {data.stat}
          </span>
        )}
        {data.suffix && (
          <span
            {...pa("suffix")}
            className={`font-display ${suffixClass} font-bold ${bg.text || "text-brand"}`}
          >
            {data.suffix}
          </span>
        )}
      </div>
      {data.label && (
        <p
          {...pa("label")}
          className={`text-sm mt-2 ${bg.textMuted || "text-on-surface-variant"}`}
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
