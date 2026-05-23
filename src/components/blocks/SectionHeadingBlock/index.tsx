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
  displayName: "Centered Section Heading",
  contentType: "SectionHeadingBlock",
  tag: "Centered",
  settings: {
    showAccent: {
      editor: "checkbox",
      displayName: "Show Accent Line",
      sortOrder: 0,
      choices: {},
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
};

export default function SectionHeadingBlock(props: SectionHeadingBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCentered = ds?.alignment === "center";
  const showAccent = ds?.showAccent === true;

  return (
    <div className={`py-20 max-w-7xl mx-auto px-8 ${isCentered ? "text-center" : ""}`}>
      <div className={`${showAccent ? "insight-rail" : ""} ${isCentered ? "max-w-2xl mx-auto" : "max-w-2xl"}`}>
        {data.heading && (
          <h2
            {...pa("heading")}
            className="font-display text-3xl md:text-4xl font-extrabold mb-4 text-on-surface"
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
