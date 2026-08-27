import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";

export const FaqContainerBlockType = contentType({
  key: "FaqContainerBlock",
  displayName: "FAQ Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string",    displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string",    displayName: "Subheading", indexingType: "searchable", isLocalized: true },
    faqItems:   { type: "array", items: { type: "content", allowedTypes: [FaqItemBlockType] }, displayName: "FAQ Items" },
  },
});

export const FaqContainerBlockDefaultTemplate = displayTemplate({
  key: "FaqContainerBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "FaqContainerBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
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
  const style = resolveStyleClasses(props.displaySettings, { background: "transparent" });

  return (
    <div data-component="FaqContainerBlock" className="py-16 max-w-3xl mx-auto px-8">
      {data.heading && (
        <h2
          {...pa("heading")}
          className={`${style.font} text-3xl md:text-4xl font-extrabold mb-3 ${style.text}`}
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className={`text-base ${style.textMuted} mb-8`}
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
