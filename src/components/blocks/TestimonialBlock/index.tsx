import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { resolveImageUrl, type ImageRef } from "../_shared/contentRefs";
import {
  BACKGROUND, TEXT_COLOR, TEXT_ALIGN, FONT_STYLE, TEXT_SIZE, TEXT_ALIGN_CLASSES, TEXT_SIZE_CLASSES,
  resolveStyleClasses, withDefault, SPACING, spacingClass,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

export const TestimonialBlockType = contentType({
  key: "TestimonialBlock",
  displayName: "Testimonial",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    quote: { type: "string", displayName: "Quote", indexingType: "searchable", isLocalized: true },
    authorName: { type: "string", displayName: "Author Name", isLocalized: true },
    authorRole: { type: "string", displayName: "Author Role", isLocalized: true },
    // No indexingType: "disabled" here - it drops the field from Graph and the SDK query.
    authorImage: { type: "contentReference", displayName: "Author Photo", allowedTypes: ["_image"] },
  },
});

// Default is the unboxed quote, so it has no background control - "Card (boxed)" is
// the template for a quote on a surface.
export const TestimonialBlockDefaultTemplate = displayTemplate({
  key: "TestimonialBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "TestimonialBlock",
  settings: {
    ...TEXT_COLOR,
    ...FONT_STYLE,
    ...TEXT_ALIGN,
    ...withDefault(TEXT_SIZE, "sm"),
    ...SPACING,
  },
});

export const TestimonialCardTemplate = displayTemplate({
  key: "TestimonialCardTemplate",
  isDefault: false,
  displayName: "Card (boxed)",
  contentType: "TestimonialBlock",
  tag: "Card",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
    ...withDefault(TEXT_SIZE, "md"),
  },
});

export const TestimonialMinimalTemplate = displayTemplate({
  key: "TestimonialMinimalTemplate",
  isDefault: false,
  displayName: "Minimal (pull-quote with accent)",
  contentType: "TestimonialBlock",
  tag: "Minimal",
  settings: {
    ...TEXT_COLOR,
    ...FONT_STYLE,
    ...TEXT_ALIGN,
    ...withDefault(TEXT_SIZE, "md"),
  },
});

interface TestimonialData {
  quote?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorImage?: ImageRef;
  __context?: { edit?: boolean } | null;
}

type TestimonialBlockProps = TestimonialData & {
  content?: TestimonialData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

// Pull-quote sizes for the unboxed layouts (Default and Minimal).
const QUOTE_SIZES: Record<string, string> = {
  sm: "text-xl md:text-2xl",
  md: "text-2xl md:text-3xl",
  lg: "text-3xl md:text-4xl",
};

const JUSTIFY: Record<string, string> = { center: "justify-center", right: "justify-end" };

export default function TestimonialBlock(props: TestimonialBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));

  const isCard = props.displayTemplateKey === "TestimonialCardTemplate";
  const isMinimal = props.displayTemplateKey === "TestimonialMinimalTemplate";
  const photoUrl = resolveImageUrl(data.authorImage);

  let wrapperClass: string;
  let authorJustify = "";
  let textColor: string;
  let mutedColor: string;
  let quoteClass: string;

  if (isCard) {
    const bg = resolveStyleClasses(ds, { background: "white" });
    const textSizeClass = TEXT_SIZE_CLASSES[(ds?.textSize as string) || "md"];
    wrapperClass = `${bg.wrapper} rounded-2xl p-10`;
    textColor = bg.text;
    mutedColor = bg.textMuted;
    quoteClass = `${bg.font} ${textSizeClass} leading-relaxed mb-8`;
  } else if (isMinimal) {
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) || "left"];
    const textSizeClass = QUOTE_SIZES[(ds?.textSize as string) || "md"] ?? QUOTE_SIZES.md;
    wrapperClass = `insight-rail py-12 max-w-3xl mx-auto ${alignClass}`;
    const minimalStyle = resolveStyleClasses(ds, { background: "transparent" });
    textColor = minimalStyle.text;
    mutedColor = minimalStyle.textMuted;
    quoteClass = `${minimalStyle.font} ${textSizeClass} italic leading-relaxed mb-8`;
  } else {
    // Ignores any stored background: this layout never paints a surface.
    const plain = resolveStyleClasses({ ...ds, background: "transparent" });
    const alignKey = (ds?.textAlign as string) || "left";
    wrapperClass = `${spacingClass(ds, "py-20")} max-w-3xl mx-auto ${TEXT_ALIGN_CLASSES[alignKey] ?? ""}`;
    authorJustify = JUSTIFY[alignKey] ?? "";
    textColor = plain.text;
    mutedColor = plain.textMuted;
    quoteClass = `${plain.font} ${QUOTE_SIZES[(ds?.textSize as string) || "sm"] ?? QUOTE_SIZES.sm} leading-relaxed mb-8`;
  }

  return (
    <div data-component="TestimonialBlock" className={wrapperClass}>
      {data.quote && (
        <blockquote
          {...pa("quote")}
          className={`${quoteClass} ${textColor}`}
        >
          &ldquo;{data.quote}&rdquo;
        </blockquote>
      )}
      <div className={`flex items-center gap-4 ${authorJustify}`}>
        {photoUrl && (
          <Image
            src={photoUrl}
            alt={data.authorName ?? ""}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        )}
        <div>
          {data.authorName && (
            <p {...pa("authorName")} className={`text-sm font-semibold ${textColor}`}>
              {data.authorName}
            </p>
          )}
          {data.authorRole && (
            <p {...pa("authorRole")} className={`text-sm ${mutedColor}`}>
              {data.authorRole}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
