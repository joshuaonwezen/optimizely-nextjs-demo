import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_SIZE, TEXT_ALIGN, FONT_STYLE,
  BG_CLASSES, TEXT_SIZE_CLASSES, TEXT_ALIGN_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

export const TestimonialBlockType = contentType({
  key: "TestimonialBlock",
  displayName: "Testimonial",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    quote: { type: "string", displayName: "Quote", indexingType: "searchable", isLocalized: true },
    authorName: { type: "string", displayName: "Author Name", isLocalized: true },
    authorRole: { type: "string", displayName: "Author Role", isLocalized: true },
    authorImage: { type: "contentReference", displayName: "Author Photo", allowedTypes: ["_image"], indexingType: "disabled" },
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
    ...TEXT_SIZE,
  },
});

export const TestimonialMinimalTemplate = displayTemplate({
  key: "TestimonialMinimalTemplate",
  isDefault: false,
  displayName: "Minimal (pull-quote with accent)",
  contentType: "TestimonialBlock",
  tag: "Minimal",
  settings: {
    ...TEXT_SIZE,
    ...FONT_STYLE,
    ...TEXT_ALIGN,
  },
});

interface TestimonialData {
  quote?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorImage?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  __context?: { edit?: boolean } | null;
}

type TestimonialBlockProps = TestimonialData & {
  content?: TestimonialData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function TestimonialBlock(props: TestimonialBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCard = props.displayTemplateKey === "TestimonialCardTemplate";
  const isMinimal = props.displayTemplateKey === "TestimonialMinimalTemplate";
  const photoUrl = data.authorImage?._metadata?.url?.default;

  let wrapperClass: string;
  let textColor: string;
  let mutedColor: string;
  let quoteClass: string;

  if (isCard) {
    const bgKey = (ds?.background as string) || "white";
    const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.white;
    const textSizeClass = TEXT_SIZE_CLASSES[(ds?.textSize as string) ?? "md"];
    wrapperClass = `${bg.wrapper} rounded-2xl p-10`;
    textColor = bg.text;
    mutedColor = bg.textMuted;
    quoteClass = `font-display ${textSizeClass} leading-relaxed mb-8`;
  } else if (isMinimal) {
    const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "left"];
    const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
    const textSizeClass = (ds?.textSize as string) === "sm"
      ? "text-xl md:text-2xl"
      : "text-2xl md:text-3xl";
    wrapperClass = `insight-rail py-12 max-w-3xl mx-auto ${alignClass}`;
    textColor = "text-on-surface";
    mutedColor = "text-on-surface-variant";
    quoteClass = `${fontClass} ${textSizeClass} italic leading-relaxed mb-8`;
  } else {
    wrapperClass = "py-20 max-w-3xl mx-auto";
    textColor = "text-on-surface";
    mutedColor = "text-on-surface-variant";
    quoteClass = "font-display text-xl md:text-2xl leading-relaxed mb-8";
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
      <div className="flex items-center gap-4">
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
