import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_COLOR, HEADING_SIZE, TEXT_ALIGN, HEADING_CLASSES, TEXT_ALIGN_CLASSES,
  resolveStyleClasses, withDefault,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

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

// Default paints no surface, so it has no background control; "Highlighted" is the
// boxed variant. No font control: the number uses the .type-h1 display face.
export const StatsCounterBlockDefaultTemplate = displayTemplate({
  key: "StatsCounterBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "StatsCounterBlock",
  settings: {
    ...TEXT_COLOR,
    ...withDefault(HEADING_SIZE, "lg"),
    ...withDefault(TEXT_ALIGN, "center"),
  },
});

export const StatsCounterAccentTemplate = displayTemplate({
  key: "StatsCounterAccentTemplate",
  isDefault: false,
  displayName: "Accent rail (left bar)",
  contentType: "StatsCounterBlock",
  tag: "Accent",
  settings: {
    ...withDefault(HEADING_SIZE, "lg"),
    ...TEXT_ALIGN,
    accentColor: {
      editor: "select" as const,
      displayName: "Number color",
      sortOrder: 10,
      choices: {
        brand:    { displayName: "Green", sortOrder: 0 },
        tertiary: { displayName: "Teal",  sortOrder: 1 },
        surface:  { displayName: "Dark",  sortOrder: 2 },
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
    ...TEXT_COLOR,
    ...withDefault(HEADING_SIZE, "lg"),
    ...withDefault(TEXT_ALIGN, "center"),
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
  const { pa } = getPreviewUtils(asSdkContent(data));

  const isHighlight = props.displayTemplateKey === "StatsCounterHighlightTemplate";
  const isAccent = props.displayTemplateKey === "StatsCounterAccentTemplate";

  if (isAccent) {
    const headingSizeKey = (ds?.headingSize as string) || "lg";
    const baseValueClass = HEADING_CLASSES[headingSizeKey];
    const suffixSizeKey = headingSizeKey === "xl" ? "lg" : "md";
    const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) || "left"];
    const valueColor = ACCENT_COLOR_CLASSES[(ds?.accentColor as string) || "brand"] ?? "text-brand";
    return (
      <div data-component="StatsCounterBlock" className={`insight-rail py-6 ${alignClass}`}>
        {data.value && (
          <p className={`type-h1 ${baseValueClass} mb-2 ${valueColor}`}>
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

  const bg = resolveStyleClasses(ds, { background: isHighlight ? "white" : "transparent" });

  const headingSizeKey = (ds?.headingSize as string) || "lg";
  const baseValueClass = HEADING_CLASSES[headingSizeKey];
  const suffixSizeKey = headingSizeKey === "xl" ? "lg" : headingSizeKey === "lg" ? "md" : "sm";
  const suffixClass = HEADING_CLASSES[suffixSizeKey] ?? "text-3xl md:text-4xl";

  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) || "center"];

  return (
    <div data-component="StatsCounterBlock" className="relative">
      {isHighlight && (
        // Squircle surface sits on a background layer so it can't clip the content.
        <div aria-hidden className={`squircle-bg absolute inset-0 ${bg.wrapper}`} />
      )}
      <div className={`relative p-8 ${alignClass}`}>
        {data.value && (
          <p className={`type-h1 ${baseValueClass} mb-2 ${bg.text || "text-brand"}`}>
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
    </div>
  );
}
