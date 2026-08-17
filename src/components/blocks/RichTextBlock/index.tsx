import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_COLOR, TEXT_ALIGN, FONT_STYLE, TEXT_SIZE, FONT_CLASSES, TEXT_ALIGN_CLASSES, TEXT_SIZE_CLASSES, resolveStyleClasses,
} from "../_shared/displayTemplateSettings";

export const TextBlockType = contentType({
  key: "TextBlock",
  displayName: "Text Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    body: { type: "richText", displayName: "Body", isLocalized: true },
  },
});

export const TextBlockDefaultTemplate = displayTemplate({
  key: "TextBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "TextBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

export const TextBlockNarrowTemplate = displayTemplate({
  key: "TextBlockNarrowTemplate",
  isDefault: false,
  displayName: "Narrow layout",
  contentType: "TextBlock",
  tag: "Narrow",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...TEXT_SIZE,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
    verticalPadding: {
      editor: "select" as const,
      displayName: "Vertical padding",
      sortOrder: 10,
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
  displayTemplateKey?: string;
};

const PADDING_CLASSES: Record<string, string> = {
  default:  "py-16",
  compact:  "py-8",
  spacious: "py-24",
};

export default function TextBlock(props: TextBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isNarrow = props.displayTemplateKey === "TextBlockNarrowTemplate";
  const paddingClass = PADDING_CLASSES[(ds?.verticalPadding as string) ?? "default"] ?? "py-16";
  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "left"] ?? "text-left";
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "classic"];
  const textSizeClass = TEXT_SIZE_CLASSES[(ds?.textSize as string) ?? "md"] ?? "text-base";
  const widthClass = isNarrow ? "max-w-2xl" : "max-w-4xl";
  const style = resolveStyleClasses(ds, { background: "transparent", fontStyle: "classic" });
  const surfaceClass = style.wrapper ? `${style.wrapper} rounded-2xl` : "";
  const containerClass = `${widthClass} mx-auto px-8 ${paddingClass} ${surfaceClass} ${style.textMuted} ${alignClass}`;

  if (data.body && typeof data.body === "object" && "json" in data.body && data.body.json) {
    return (
      <div data-component="TextBlock" {...pa("body")} className={containerClass}>
        <div className={`${fontClass} ${textSizeClass} leading-relaxed space-y-6`}>
          <RichText content={data.body.json as RichTextProps["content"]} />
        </div>
      </div>
    );
  }

  if (typeof data.body === "string" && data.body) {
    return (
      <div
        data-component="TextBlock"
        {...pa("body")}
        className={`${containerClass} ${fontClass} ${textSizeClass} leading-relaxed`}
        dangerouslySetInnerHTML={{ __html: data.body }}
      />
    );
  }

  return null;
}
