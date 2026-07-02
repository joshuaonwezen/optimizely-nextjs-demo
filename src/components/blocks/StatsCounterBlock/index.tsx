import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, HEADING_SIZE, TEXT_ALIGN,
  BG_CLASSES, HEADING_CLASSES, TEXT_ALIGN_CLASSES,
} from "../_shared/displayTemplateSettings";

export const StatsCounterBlockType = contentType({
  key: "StatsCounterBlock",
  displayName: "Stats Counter",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    value: { type: "string", displayName: "Value" },
    label: { type: "string", displayName: "Label", isLocalized: true },
    suffix: { type: "string", displayName: "Suffix (e.g. %, +, K)", isLocalized: true },
  },
});

export const StatsCounterAccentTemplate = displayTemplate({
  key: "StatsCounterAccentTemplate",
  isDefault: false,
  displayName: "Accent rail (left bar)",
  contentType: "StatsCounterBlock",
  tag: "Accent",
  settings: {
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    accentColor: {
      editor: "select" as const,
      displayName: "Number color",
      sortOrder: 5,
      choices: {
        brand:    { displayName: "Blue",         sortOrder: 0 },
        tertiary: { displayName: "Purple",       sortOrder: 1 },
        surface:  { displayName: "Dark (default)", sortOrder: 2 },
      },
    },
  },
});

export const StatsCounterHighlightTemplate = displayTemplate({
  key: "StatsCounterHighlightTemplate",
  isDefault: false,
  displayName: "Highlighted (colored box)",
  contentType: "StatsCounterBlock",
  tag: "Highlight",
  settings: {
    ...BACKGROUND,
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    size: {
      editor: "select" as const,
      displayName: "Layout density",
      sortOrder: 5,
      choices: {
        default: { displayName: "Standard", sortOrder: 0 },
        compact: { displayName: "Compact",  sortOrder: 1 },
      },
    },
  },
});

interface StatsCounterData {
  value?: string | null;
  label?: string | null;
  suffix?: string | null;
  __context?: { edit?: boolean } | null;
}

type StatsCounterBlockProps = StatsCounterData & {
  content?: StatsCounterData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

const ACCENT_COLOR_CLASSES: Record<string, string> = {
  brand:    "text-brand",
  tertiary: "text-tertiary",
  surface:  "text-on-surface",
};

export default function StatsCounterBlock(props: StatsCounterBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isHighlight = props.displayTemplateKey === "StatsCounterHighlightTemplate";
  const isAccent = props.displayTemplateKey === "StatsCounterAccentTemplate";
  const isCompact = ds?.size === "compact";

  if (isAccent) {
    const headingSizeKey = (ds?.headingSize as string) ?? "lg";
    const baseValueClass = HEADING_CLASSES[headingSizeKey];
    const suffixSizeKey = headingSizeKey === "xl" ? "lg" : "md";
    const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "left"];
    const valueColor = ACCENT_COLOR_CLASSES[(ds?.accentColor as string) ?? "brand"] ?? "text-brand";
    return (
      <div data-component="StatsCounterBlock" className={`insight-rail py-6 ${alignClass}`}>
        {data.value && (
          <p className={`font-display ${baseValueClass} font-extrabold mb-2 ${valueColor}`}>
            <span {...pa("value")}>{data.value}</span>
            {data.suffix && (
              <span {...pa("suffix")} className={suffixClass}>{data.suffix}</span>
            )}
          </p>
        )}
        {data.label && (
          <p {...pa("label")} className="text-sm font-medium uppercase tracking-wider text-on-surface-variant">
            {data.label}
          </p>
        )}
      </div>
    );
  }

  const bgKey = (ds?.background as string) || (isHighlight ? "white" : "transparent");
  const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.transparent;

  const headingSizeKey = (ds?.headingSize as string) ?? (isCompact ? "md" : "lg");
  const baseValueClass = HEADING_CLASSES[headingSizeKey];
  const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
  const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";

  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "center"];
  const boxClass = isHighlight ? `${bg.wrapper} rounded-xl` : "";

  return (
    <div
      data-component="StatsCounterBlock"
      className={`p-8 ${alignClass} ${boxClass}`}
    >
      {data.value && (
        <p className={`font-display ${baseValueClass} font-extrabold mb-2 ${bg.text || "text-brand"}`}>
          <span {...pa("value")}>{data.value}</span>
          {data.suffix && (
            <span {...pa("suffix")} className={suffixClass}>{data.suffix}</span>
          )}
        </p>
      )}
      {data.label && (
        <p
          {...pa("label")}
          className={`text-sm font-medium uppercase tracking-wider ${bg.textMuted || "text-on-surface-variant"}`}
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
