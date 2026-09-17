import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import CmsRichText, { hasRichText } from "@/components/cms/CmsRichText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, TEXT_ALIGN, FONT_STYLE, TEXT_SIZE, FONT_CLASSES, TEXT_ALIGN_CLASSES, TEXT_SIZE_CLASSES,
  resolveStyleClasses, withDefault,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

export const TextBlockType = contentType({
  key: "TextBlock",
  displayName: "Text Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    body: { type: "richText", displayName: "Body", isLocalized: true },
  },
});

// Width is a setting (the old "Narrow layout" template). Body copy defaults to the
// body font - the display font is for headings.
export const TextBlockDefaultTemplate = displayTemplate({
  key: "TextBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "TextBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...withDefault(TEXT_ALIGN, "left"),
    ...withDefault(FONT_STYLE, "classic"),
    ...withDefault(TEXT_SIZE, "md"),
    width: {
      editor: "select" as const,
      displayName: "Width",
      sortOrder: 10,
      choices: {
        wide:   { displayName: "Standard", sortOrder: 0 },
        narrow: { displayName: "Narrow",   sortOrder: 1 },
      },
    },
    verticalPadding: {
      editor: "select" as const,
      displayName: "Vertical padding",
      sortOrder: 11,
      choices: {
        default:  { displayName: "Standard", sortOrder: 0 },
        compact:  { displayName: "Compact",  sortOrder: 1 },
        spacious: { displayName: "Spacious", sortOrder: 2 },
      },
    },
  },
});

interface TextBlockData {
  body?: { json: unknown } | string | null;
  __context?: { edit?: boolean } | null;
}

type TextBlockProps = TextBlockData & {
  content?: TextBlockData;
  displaySettings?: Record<string, string | boolean>;
};

const PADDING_CLASSES: Record<string, string> = {
  default:  "py-16",
  compact:  "py-8",
  spacious: "py-24",
};

export default function TextBlock(props: TextBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));

  const paddingClass = PADDING_CLASSES[(ds?.verticalPadding as string) || "default"] ?? "py-16";
  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) || "left"] ?? "text-left";
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) || "classic"];
  const textSizeClass = TEXT_SIZE_CLASSES[(ds?.textSize as string) || "md"] ?? "text-base";
  const widthClass = ds?.width === "narrow" ? "max-w-2xl" : "max-w-4xl";
  const style = resolveStyleClasses(ds, { background: "transparent", fontStyle: "classic" });
  const surfaceClass = style.wrapper ? `${style.wrapper} rounded-2xl` : "";
  const containerClass = `${widthClass} mx-auto px-8 ${paddingClass} ${surfaceClass} ${style.textMuted} ${alignClass}`;

  if (!hasRichText(data.body)) return null;

  return (
    <div data-component="TextBlock" {...pa("body")} className={containerClass}>
      <div className={`richtext ${style.invert ? "richtext-invert" : ""} ${fontClass} ${textSizeClass}`}>
        <CmsRichText value={data.body} />
      </div>
    </div>
  );
}
