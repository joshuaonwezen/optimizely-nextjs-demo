import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, HEADING_SIZE, TEXT_ALIGN, FONT_STYLE, TEXT_ALIGN_CLASSES, resolveStyleClasses,
} from "../_shared/displayTemplateSettings";

export const SectionHeadingBlockType = contentType({
  key: "SectionHeadingBlock",
  displayName: "Section Heading",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", indexingType: "searchable", isLocalized: true },
  },
});

const HEADING_BLOCK_SETTINGS = {
  showAccent: {
    editor: "checkbox" as const,
    displayName: "Show accent bar",
    sortOrder: 10,
    choices: {},
  },
  ...BACKGROUND_NONE_DEFAULT,
  ...TEXT_COLOR,
  ...HEADING_SIZE,
  ...TEXT_ALIGN,
  ...FONT_STYLE,
};

export const SectionHeadingDefaultTemplate = displayTemplate({
  key: "SectionHeadingDefaultTemplate",
  isDefault: true,
  displayName: "Default (left-aligned)",
  contentType: "SectionHeadingBlock",
  settings: HEADING_BLOCK_SETTINGS,
});

export const SectionHeadingCenteredTemplate = displayTemplate({
  key: "SectionHeadingCenteredTemplate",
  isDefault: false,
  displayName: "Centered heading",
  contentType: "SectionHeadingBlock",
  tag: "Centered",
  settings: HEADING_BLOCK_SETTINGS,
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

  const bgKey = (ds?.background as string) || "transparent";
  const s = resolveStyleClasses(ds, { background: "transparent" });
  const alignKey = (ds?.textAlign as string) || (isCentered ? "center" : "left");
  const alignClass = TEXT_ALIGN_CLASSES[alignKey] ?? "text-left";

  const hasBg = bgKey !== "transparent" && s.wrapper;
  const outerPadding = hasBg ? "py-20 px-8 rounded-2xl" : "py-20";

  return (
    <div data-component="SectionHeadingBlock" className={`${outerPadding} ${hasBg ? s.wrapper : ""} ${alignClass}`}>
      <div className={`${showAccent && alignKey === "left" ? "insight-rail" : ""} ${alignKey === "center" ? "max-w-2xl mx-auto" : "max-w-2xl"}`}>
        {data.heading && (
          <h2
            {...pa("heading")}
            className={`${s.font} ${s.heading} font-extrabold mb-4 ${s.text}`}
          >
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p
            {...pa("subheading")}
            className={`text-base leading-relaxed ${s.textMuted}`}
          >
            {data.subheading}
          </p>
        )}
      </div>
    </div>
  );
}
