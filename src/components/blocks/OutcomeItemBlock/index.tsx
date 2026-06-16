import { contentType } from "@optimizely/cms-sdk";
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

interface OutcomeData {
  stat?:   string | null;
  suffix?: string | null;
  label?:  string | null;
  __context?: { edit?: boolean } | null;
}

type OutcomeItemBlockProps = OutcomeData & {
  content?: OutcomeData;
  displaySettings?: Record<string, string | boolean>;
};

export default function OutcomeItemBlock(props: OutcomeItemBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  if (!data.stat && !data.label) return null;

  return (
    <div data-component="OutcomeItemBlock" className="text-center px-6 py-4">
      <div className="flex items-baseline justify-center gap-1">
        {data.stat && (
          <span
            {...pa("stat")}
            className="font-display text-5xl font-extrabold text-brand"
          >
            {data.stat}
          </span>
        )}
        {data.suffix && (
          <span
            {...pa("suffix")}
            className="font-display text-3xl font-bold text-brand"
          >
            {data.suffix}
          </span>
        )}
      </div>
      {data.label && (
        <p
          {...pa("label")}
          className="text-sm text-on-surface-variant mt-2"
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
