import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import CmsRichText, { hasRichText } from "@/components/cms/CmsRichText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { resolveImageUrl, type ImageRef } from "../_shared/contentRefs";

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

export default function SpotlightBlock(props: SpotlightBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const imageUrl = resolveImageUrl(data.image);
  const bg = resolveStyleClasses(ds, { background: "white" });

  const isWide = data.spacing !== "narrow";
  const paddingClass = isWide ? "py-16 px-8" : "py-10 px-6";


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
              className={`${bg.font} text-xl md:text-2xl font-semibold italic ${bg.text || "text-on-surface"} mb-4 leading-snug`}
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

          {hasRichText(data.textfield) && (
            <div
              {...pa("textfield")}
              className={`richtext ${bg.invert ? "richtext-invert" : ""} mt-4 text-base ${bg.textMuted || "text-on-surface-variant"}`}
            >
              <CmsRichText value={data.textfield} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
