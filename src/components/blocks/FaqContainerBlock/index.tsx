import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses,
  SPACING, CONTENT_WIDTH, HEADING_SIZE, TEXT_ALIGN, spacingClass, widthClass, withDefault,
} from "../_shared/displayTemplateSettings";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";

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
    ...withDefault(HEADING_SIZE, "md"),
    ...TEXT_ALIGN,
    ...FONT_STYLE,
    ...SPACING,
    ...CONTENT_WIDTH,
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
  const { pa } = getPreviewUtils(asSdkContent(data));
  const ds = props.displaySettings;
  const style = resolveStyleClasses(ds, { background: "transparent", headingSize: "md" });

  return (
    <div data-component="FaqContainerBlock" className={`${spacingClass(ds, "py-16")} ${widthClass(ds, "max-w-3xl")} mx-auto px-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}>
      <BlockHeader
        heading={data.heading}
        subheading={data.subheading}
        pa={pa}
        style={style}
        headingSize={style.heading}
        align={style.align}
        subheadingClassName="text-base mb-8"
      />
      {data.faqItems && data.faqItems.length > 0 && (
        <div {...pa("faqItems")} className="space-y-2">
          {data.faqItems.map((item, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={asSdkContent(item)} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </div>
  );
}
