import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, HEADING_SIZE, TEXT_ALIGN, FONT_STYLE, HEADING_CLASSES, TEXT_ALIGN_CLASSES,
  resolveStyleClasses, withDefault,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

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

// Picking any Background boxes the stat - that replaces the old "Boxed stat" template.
export const OutcomeItemBlockDefaultTemplate = displayTemplate({
  key: "OutcomeItemBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "OutcomeItemBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...HEADING_SIZE,
    ...withDefault(TEXT_ALIGN, "center"),
    ...FONT_STYLE,
  },
});

export const OutcomeItemInlineTemplate = displayTemplate({
  key: "OutcomeItemInlineTemplate",
  isDefault: false,
  displayName: "Inline stat (number and label side by side)",
  contentType: "OutcomeItemBlock",
  tag: "Inline",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
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
  const { pa } = getPreviewUtils(asSdkContent(data));
  if (!data.stat && !data.label) return null;

  const isInline = props.displayTemplateKey === "OutcomeItemInlineTemplate";

  if (isInline) {
    const headingSizeKey = (ds?.headingSize as string) || "xl";
    const statClass = HEADING_CLASSES[headingSizeKey];
    const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
    const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";
    const bg = resolveStyleClasses(ds, { background: "transparent" });
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) || "left"];
    return (
      <div data-component="OutcomeItemBlock" className={`flex items-baseline gap-3 ${alignClass} ${bg.wrapper ? `${bg.wrapper} rounded-xl p-4` : ""}`}>
        <div className="flex items-baseline gap-1 flex-shrink-0">
          {data.stat && (
            <span {...pa("stat")} className={`${bg.font} ${statClass} font-extrabold ${bg.text || "text-brand"}`}>
              {data.stat}
            </span>
          )}
          {data.suffix && (
            <span {...pa("suffix")} className={`${bg.font} ${suffixClass} font-bold ${bg.text || "text-brand"}`}>
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

  const bg = resolveStyleClasses(ds, { background: "transparent" });

  const headingSizeKey = (ds?.headingSize as string) || "xl";
  const statClass = HEADING_CLASSES[headingSizeKey];
  const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
  const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";

  const alignKey = (ds?.textAlign as string) || "center";
  const alignClass = TEXT_ALIGN_CLASSES[alignKey];
  const wrapperClass = bg.wrapper
    ? `${alignClass} p-8 rounded-xl ${bg.wrapper}`
    : `${alignClass} px-6 py-4`;

  return (
    <div data-component="OutcomeItemBlock" className={wrapperClass}>
      <div className={`flex items-baseline gap-1 ${alignKey === "center" ? "justify-center" : alignKey === "right" ? "justify-end" : "justify-start"}`}>
        {data.stat && (
          <span
            {...pa("stat")}
            className={`${bg.font} ${statClass} font-extrabold ${bg.text || "text-brand"}`}
          >
            {data.stat}
          </span>
        )}
        {data.suffix && (
          <span
            {...pa("suffix")}
            className={`${bg.font} ${suffixClass} font-bold ${bg.text || "text-brand"}`}
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
