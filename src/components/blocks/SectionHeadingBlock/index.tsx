import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const SectionHeadingBlockType = contentType({
  key: "SectionHeadingBlock",
  displayName: "Section Heading",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable" },
    subheading: { type: "string", displayName: "Subheading" },
  },
});

export const SectionHeadingCenteredTemplate = displayTemplate({
  key: "SectionHeadingCenteredTemplate",
  isDefault: false,
  displayName: "Centred heading",
  contentType: "SectionHeadingBlock",
  tag: "Centered",
  settings: {
    showAccent: {
      editor: "checkbox" as const,
      displayName: "Show coloured bar on the left",
      sortOrder: 0,
      choices: {},
    },
    size: {
      editor: "select" as const,
      displayName: "Heading size",
      sortOrder: 1,
      choices: {
        default: { displayName: "Standard",              sortOrder: 0 },
        large:   { displayName: "Large (section opener)", sortOrder: 1 },
      },
    },
  },
});

interface SectionHeadingData {
  heading?: string | null;
  subheading?: string | null;
  __context?: { edit?: boolean } | null;
}

type SectionHeadingBlockProps = SectionHeadingData & {
  content?: SectionHeadingData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function SectionHeadingBlock(props: SectionHeadingBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCentered = props.displayTemplateKey === "SectionHeadingCenteredTemplate";
  const showAccent = ds?.showAccent === true;
  const isLarge = ds?.size === "large";

  return (
    <div className={`py-20 ${isCentered ? "text-center" : ""}`}>
      <div className={`${showAccent ? "insight-rail" : ""} ${isCentered ? "max-w-2xl mx-auto" : "max-w-2xl"}`}>
        {data.heading && (
          <h2
            {...pa("heading")}
            className={`font-display ${isLarge ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"} font-extrabold mb-4 text-on-surface`}
          >
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p
            {...pa("subheading")}
            className="text-base leading-relaxed text-on-surface-variant"
          >
            {data.subheading}
          </p>
        )}
      </div>
    </div>
  );
}
