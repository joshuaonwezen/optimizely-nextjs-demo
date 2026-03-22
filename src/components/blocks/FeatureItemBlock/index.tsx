import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface FeatureItemData {
  title?: string | null;
  description?: string | null;
  __context?: any;
}

type FeatureItemBlockProps = FeatureItemData & {
  content?: FeatureItemData;
};

export default function FeatureItemBlock(props: FeatureItemBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <div
      className="rounded-2xl p-8 h-full"
      style={{ background: "var(--surface-container-lowest)" }}
    >
      {data.title && (
        <h3
          {...pa("title")}
          className="text-base font-bold mb-3"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--on-surface)",
          }}
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className="text-sm leading-relaxed"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {data.description}
        </p>
      )}
    </div>
  );
}
