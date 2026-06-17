import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

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

const TESTIMONIAL_THEME_SETTING = {
  theme: {
    editor: "select" as const,
    displayName: "Background color",
    sortOrder: 0,
    choices: {
      default: { displayName: "White",      sortOrder: 0 },
      brand:   { displayName: "Brand blue", sortOrder: 1 },
    },
  },
  size: {
    editor: "select" as const,
    displayName: "Quote text size",
    sortOrder: 1,
    choices: {
      default: { displayName: "Standard", sortOrder: 0 },
      compact: { displayName: "Compact",  sortOrder: 1 },
    },
  },
};

export const TestimonialCardTemplate = displayTemplate({
  key: "TestimonialCardTemplate",
  isDefault: false,
  displayName: "Card (boxed)",
  contentType: "TestimonialBlock",
  tag: "Card",
  settings: TESTIMONIAL_THEME_SETTING,
});

export const TestimonialMinimalTemplate = displayTemplate({
  key: "TestimonialMinimalTemplate",
  isDefault: false,
  displayName: "Minimal (pull-quote with accent)",
  contentType: "TestimonialBlock",
  tag: "Minimal",
  settings: {},
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
  const isBrand = ds?.theme === "brand";
  const isCompact = ds?.size === "compact";
  const photoUrl = data.authorImage?._metadata?.url?.default;

  const textColor = isBrand ? "text-on-brand" : "text-on-surface";
  const mutedColor = isBrand ? "text-on-brand/80" : "text-on-surface-variant";

  let wrapperClass: string;
  if (isCard) {
    const padding = isCompact ? "p-6" : "p-10";
    wrapperClass = isBrand
      ? `bg-gradient-brand rounded-2xl ${padding}`
      : `bg-surface-lowest rounded-2xl border border-outline-variant ${padding}`;
  } else if (isMinimal) {
    wrapperClass = "insight-rail py-12 max-w-3xl mx-auto";
  } else {
    wrapperClass = "py-20 max-w-3xl mx-auto";
  }

  return (
    <div data-component="TestimonialBlock" className={wrapperClass}>
      {data.quote && (
        <blockquote
          {...pa("quote")}
          className={`font-display ${isCard && isCompact ? "text-sm" : isCard ? "text-base" : isMinimal ? "text-2xl md:text-3xl italic" : "text-xl md:text-2xl"} leading-relaxed mb-8 ${textColor}`}
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
