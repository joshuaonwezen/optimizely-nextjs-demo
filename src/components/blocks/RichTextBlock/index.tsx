import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const TextBlockType = contentType({
  key: "TextBlock",
  displayName: "Text Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    body: { type: "richText", displayName: "Body", isLocalized: true },
  },
});

export const TextBlockNarrowTemplate = displayTemplate({
  key: "TextBlockNarrowTemplate",
  isDefault: false,
  displayName: "Narrow column",
  contentType: "TextBlock",
  tag: "Narrow",
  settings: {},
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

export default function TextBlock(props: TextBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const isNarrow = props.displayTemplateKey === "TextBlockNarrowTemplate";
  const containerClass = `${isNarrow ? "max-w-2xl" : "max-w-4xl"} mx-auto px-8 py-16 text-on-surface-variant`;

  // Typed GraphQL query: body arrives as { json: richTextAst }
  if (data.body && typeof data.body === "object" && "json" in data.body && data.body.json) {
    return (
      <div data-component="TextBlock" {...pa("body")} className={containerClass}>
        <div className="text-base leading-relaxed space-y-6">
          <RichText content={data.body.json as RichTextProps["content"]} />
        </div>
      </div>
    );
  }

  // _json path: body arrives as an HTML string
  if (typeof data.body === "string" && data.body) {
    return (
      <div
        data-component="TextBlock"
        {...pa("body")}
        className={containerClass}
        dangerouslySetInnerHTML={{ __html: data.body }}
      />
    );
  }

  return null;
}
