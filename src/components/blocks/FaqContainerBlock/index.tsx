import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FaqContainerBlockType = contentType({
  key: "FaqContainerBlock",
  displayName: "FAQ Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading" },
    subheading: { type: "string", displayName: "Subheading" },
  },
});

interface FaqContainerData {
  heading?:    string | null;
  subheading?: string | null;
}

type FaqContainerBlockProps = FaqContainerData & {
  content?: FaqContainerData;
  displaySettings?: Record<string, string | boolean>;
};

export default function FaqContainerBlock(props: FaqContainerBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <div className="py-16 max-w-3xl mx-auto px-8">
      {data.heading && (
        <h2
          {...pa("heading")}
          className="font-display text-3xl md:text-4xl font-extrabold mb-3 text-on-surface"
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className="text-base text-on-surface-variant mb-2"
        >
          {data.subheading}
        </p>
      )}
    </div>
  );
}
