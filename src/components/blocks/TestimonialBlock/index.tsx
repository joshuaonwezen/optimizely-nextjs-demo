import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const TestimonialBlockType = contentType({
  key: "TestimonialBlock",
  displayName: "Testimonial",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    quote: { type: "string", displayName: "Quote", indexingType: "searchable" },
    authorName: { type: "string", displayName: "Author Name" },
    authorRole: { type: "string", displayName: "Author Role" },
    authorImage: { type: "contentReference", displayName: "Author Photo", allowedTypes: ["_image"], indexingType: "disabled" },
  },
});

export const TestimonialCardTemplate = displayTemplate({
  key: "TestimonialCardTemplate",
  isDefault: false,
  displayName: "Card Testimonial",
  contentType: "TestimonialBlock",
  tag: "Card",
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
  const { pa } = getPreviewUtils(data as any);

  const isCard = props.displayTemplateKey === "TestimonialCardTemplate";
  const photoUrl = data.authorImage?._metadata?.url?.default;

  return (
    <div
      className={`${isCard ? "rounded-2xl p-10 bg-surface-lowest" : "py-20 max-w-3xl mx-auto"}`}
    >
      {data.quote && (
        <blockquote
          {...pa("quote")}
          className={`font-display ${isCard ? "text-base" : "text-xl md:text-2xl"} leading-relaxed mb-8 text-on-surface`}
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
            <p
              {...pa("authorName")}
              className="text-sm font-semibold text-on-surface"
            >
              {data.authorName}
            </p>
          )}
          {data.authorRole && (
            <p
              {...pa("authorRole")}
              className="text-sm text-on-surface-variant"
            >
              {data.authorRole}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
