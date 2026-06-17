import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

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

export const OutcomeItemBrandTemplate = displayTemplate({
  key: "OutcomeItemBrandTemplate",
  isDefault: false,
  displayName: "Stat in a colored box",
  contentType: "OutcomeItemBlock",
  tag: "Brand",
  settings: {
    theme: {
      editor: "select" as const,
      displayName: "Box color",
      sortOrder: 0,
      choices: {
        brand:   { displayName: "Brand blue",      sortOrder: 0 },
        surface: { displayName: "Surface (white)", sortOrder: 1 },
      },
    },
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

  const isBrand = props.displayTemplateKey === "OutcomeItemBrandTemplate";
  const useBrandBg = isBrand && ds?.theme !== "surface";

  const wrapperClass = isBrand
    ? `text-center p-8 rounded-xl ${useBrandBg ? "bg-gradient-brand" : "bg-surface-lowest border border-outline-variant"}`
    : "text-center px-6 py-4";
  const valueColor = useBrandBg ? "text-on-brand" : "text-brand";
  const labelColor = useBrandBg ? "text-on-brand/80" : "text-on-surface-variant";

  return (
    <div data-component="OutcomeItemBlock" className={wrapperClass}>
      <div className="flex items-baseline justify-center gap-1">
        {data.stat && (
          <span
            {...pa("stat")}
            className={`font-display text-5xl font-extrabold ${valueColor}`}
          >
            {data.stat}
          </span>
        )}
        {data.suffix && (
          <span
            {...pa("suffix")}
            className={`font-display text-3xl font-bold ${valueColor}`}
          >
            {data.suffix}
          </span>
        )}
      </div>
      {data.label && (
        <p
          {...pa("label")}
          className={`text-sm mt-2 ${labelColor}`}
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
