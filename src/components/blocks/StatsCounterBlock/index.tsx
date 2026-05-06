import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const StatsCounterBlockType = contentType({
  key: "StatsCounterBlock",
  displayName: "Stats Counter",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    value: { type: "string", displayName: "Value" },
    label: { type: "string", displayName: "Label" },
    suffix: { type: "string", displayName: "Suffix (e.g. %, +, K)" },
  },
});

interface StatsCounterData {
  value?: string | null;
  label?: string | null;
  suffix?: string | null;
}

type StatsCounterBlockProps = StatsCounterData & {
  content?: StatsCounterData;
  displaySettings?: Record<string, string | boolean>;
};

export default function StatsCounterBlock(props: StatsCounterBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <div className="text-center p-8">
      {data.value && (
        <p
          {...pa("value")}
          className="font-display text-4xl md:text-5xl font-extrabold mb-2 text-brand"
        >
          {data.value}
          {data.suffix && (
            <span className="text-3xl md:text-4xl">{data.suffix}</span>
          )}
        </p>
      )}
      {data.label && (
        <p
          {...pa("label")}
          className="text-sm font-medium uppercase tracking-wider text-on-surface-variant"
        >
          {data.label}
        </p>
      )}
    </div>
  );
}
