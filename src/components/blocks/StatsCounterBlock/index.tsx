import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

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

export const StatsCounterHighlightTemplate = displayTemplate({
  key: "StatsCounterHighlightTemplate",
  isDefault: false,
  displayName: "Highlighted (colored box)",
  contentType: "StatsCounterBlock",
  tag: "Highlight",
  settings: {
    theme: {
      editor: "select" as const,
      displayName: "Box color",
      sortOrder: 0,
      choices: {
        surface: { displayName: "Surface (white)", sortOrder: 0 },
        brand:   { displayName: "Brand blue",      sortOrder: 1 },
      },
    },
    size: {
      editor: "select" as const,
      displayName: "Number size",
      sortOrder: 1,
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

export default function StatsCounterBlock(props: StatsCounterBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isHighlight = props.displayTemplateKey === "StatsCounterHighlightTemplate";
  const isBrand = isHighlight && ds?.theme === "brand";
  const isCompact = ds?.size === "compact";

  const valueClass = isCompact
    ? "font-display text-3xl md:text-4xl font-extrabold mb-2"
    : "font-display text-4xl md:text-5xl font-extrabold mb-2";
  const suffixClass = isCompact ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl";
  const valueColor = isBrand ? "text-on-brand" : "text-brand";
  const labelColor = isBrand ? "text-on-brand/80" : "text-on-surface-variant";
  const boxClass = isHighlight
    ? (isBrand ? "bg-gradient-brand rounded-xl" : "bg-surface-lowest rounded-xl border border-outline-variant")
    : "";

  return (
    <div
      data-component="StatsCounterBlock"
      className={`text-center p-8 ${boxClass}`}
    >
      {data.value && (
        <p className={`${valueClass} ${valueColor}`}>
          <span {...pa("value")}>{data.value}</span>
          {data.suffix && (
            <span {...pa("suffix")} className={suffixClass}>{data.suffix}</span>
          )}
        </p>
      )}
      {data.label && (
        <p
          {...pa("label")}
          className={`text-sm font-medium uppercase tracking-wider ${labelColor}`}
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
