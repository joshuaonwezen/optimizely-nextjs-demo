import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface SectionHeadingData {
  heading?: string | null;
  subheading?: string | null;
  __context?: any;
}

type SectionHeadingBlockProps = SectionHeadingData & {
  content?: SectionHeadingData;
};

export default function SectionHeadingBlock(props: SectionHeadingBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <div className="py-20 max-w-7xl mx-auto px-8">
      <div className="insight-rail max-w-2xl">
        {data.heading && (
          <h2
            {...pa("heading")}
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--on-surface)",
            }}
          >
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p
            {...pa("subheading")}
            className="text-base leading-relaxed"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {data.subheading}
          </p>
        )}
      </div>
    </div>
  );
}
