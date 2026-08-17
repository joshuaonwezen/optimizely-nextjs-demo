import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, TEXT_COLOR, FONT_STYLE, FONT_CLASSES, resolveStyleClasses } from "../_shared/displayTemplateSettings";

export const SpotlightBlockType = contentType({
  key: "spotlightBlock",
  displayName: "Spotlight Block",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    person:    { type: "string",           displayName: "Person",    indexingType: "searchable", isLocalized: true },
    quote:     { type: "string",           displayName: "Quote",     indexingType: "searchable", isLocalized: true },
    image:     { type: "contentReference", displayName: "Image",     allowedTypes: ["_image"] },
    textfield: { type: "richText",         displayName: "Text",      indexingType: "searchable" },
    spacing: {
      type: "string",
      displayName: "Spacing",
      isLocalized: true,
      enum: [
        { value: "wide",   displayName: "Wide" },
        { value: "narrow", displayName: "Narrow" },
      ],
    },
  },
});

export const SpotlightBlockDefaultTemplate = displayTemplate({
  key: "SpotlightBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "spotlightBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

type ImageRef = {
  url?: { default?: string | null } | null;
  _metadata?: { url?: { default?: string | null } | null } | null;
} | null;

interface SpotlightData {
  person?:    string | null;
  quote?:     string | null;
  image?:     ImageRef;
  textfield?: { json?: unknown; html?: string } | string | null;
  spacing?:   string | null;
  __context?: { edit?: boolean } | null;
}

type SpotlightBlockProps = SpotlightData & {
  content?: SpotlightData;
  displaySettings?: Record<string, string | boolean>;
};

function resolveImageUrl(ref: ImageRef | undefined): string | null {
  if (!ref) return null;
  return ref.url?.default ?? ref._metadata?.url?.default ?? null;
}

export default function SpotlightBlock(props: SpotlightBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const imageUrl = resolveImageUrl(data.image);
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
  const bg = resolveStyleClasses(ds, { background: "white" });

  const isWide = data.spacing !== "narrow";
  const paddingClass = isWide ? "py-16 px-8" : "py-10 px-6";

  const textContent =
    data.textfield && typeof data.textfield === "object" && "json" in data.textfield
      ? (data.textfield.json as RichTextProps["content"] | null)
      : null;
  const textHtml =
    data.textfield && typeof data.textfield === "object" && "html" in data.textfield
      ? data.textfield.html
      : typeof data.textfield === "string"
      ? data.textfield
      : null;

  return (
    <section
      data-component="SpotlightBlock"
      data-track-view="SpotlightBlock"
      className={`${bg.wrapper || "bg-surface-lowest"} rounded-2xl ${paddingClass}`}
    >
      <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl mx-auto">
        {imageUrl && (
          <div className="flex-shrink-0">
            <Image
              {...(pa("image") as object)}
              src={imageUrl}
              alt={data.person ?? ""}
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {data.quote && (
            <blockquote
              {...pa("quote")}
              className={`${fontClass} text-xl md:text-2xl font-semibold italic ${bg.text || "text-on-surface"} mb-4 leading-snug`}
            >
              &ldquo;{data.quote}&rdquo;
            </blockquote>
          )}

          {data.person && (
            <p
              {...pa("person")}
              className={`text-sm font-semibold ${bg.textMuted || "text-on-surface-variant"} uppercase tracking-wide`}
            >
              {data.person}
            </p>
          )}

          {(textContent || textHtml) && (
            <div
              {...pa("textfield")}
              className={`mt-4 text-base leading-relaxed ${bg.textMuted || "text-on-surface-variant"} space-y-3`}
            >
              {textContent && <RichText content={textContent} />}
              {textHtml && <div dangerouslySetInnerHTML={{ __html: textHtml }} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
