import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";

export const FaqContainerBlockType = contentType({
  key: "FaqContainerBlock",
  displayName: "FAQ Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string",    displayName: "Heading" },
    subheading: { type: "string",    displayName: "Subheading" },
    faqItems:   { type: "array", items: { type: "content", allowedTypes: [FaqItemBlockType] }, displayName: "FAQ Items" },
  },
});

interface FaqItemData {
  __typename?: string;
  question?: string | null;
  answer?: string | null;
}

interface FaqContainerData {
  heading?:    string | null;
  subheading?: string | null;
  faqItems?:   (FaqItemData | unknown)[] | null;
  __context?: { edit?: boolean } | null;
}

type FaqContainerBlockProps = FaqContainerData & {
  content?: FaqContainerData;
  displaySettings?: Record<string, string | boolean>;
};

export default function FaqContainerBlock(props: FaqContainerBlockProps) {
  const data: FaqContainerData = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <div data-component="FaqContainerBlock" className="py-16 max-w-3xl mx-auto px-8">
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
          className="text-base text-on-surface-variant mb-8"
        >
          {data.subheading}
        </p>
      )}
      {data.faqItems && data.faqItems.length > 0 && (
        <div {...pa("faqItems")} className="space-y-2">
          {data.faqItems.map((item, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={item as any} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );
}
