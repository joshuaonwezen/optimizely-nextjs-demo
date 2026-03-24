import Image from "next/image";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface TestimonialData {
  quote?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  authorImage?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  __context?: any;
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
      className={`${isCard ? "rounded-2xl p-10 bg-surface-lowest" : "py-20 max-w-3xl mx-auto px-8"}`}
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
