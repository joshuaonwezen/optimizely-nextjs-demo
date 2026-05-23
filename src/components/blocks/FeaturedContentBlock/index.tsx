import Link from "next/link";
import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FeaturedContentBlockType = contentType({
  key: "FeaturedContentBlock",
  displayName: "Featured Content",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label:        { type: "string",           displayName: "Label (e.g. Case Study, Featured Article)" },
    featuredPage: { type: "contentReference", displayName: "Featured Page", allowedTypes: ["_page"], indexingType: "disabled" },
    description:  { type: "string",           displayName: "Override Description" },
    ctaText:      { type: "string",           displayName: "CTA Button Text" },
  },
});

interface FeaturedPageRef {
  _metadata?: {
    displayName?: string | null;
    url?: { default?: string | null } | null;
  } | null;
}

interface FeaturedContentData {
  label?:        string | null;
  featuredPage?: FeaturedPageRef | null;
  description?:  string | null;
  ctaText?:      string | null;
  __context?: { edit?: boolean } | null;
}

type FeaturedContentBlockProps = FeaturedContentData & {
  content?: FeaturedContentData;
  displaySettings?: Record<string, string | boolean>;
};

export default function FeaturedContentBlock(props: FeaturedContentBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const pageTitle = data.featuredPage?._metadata?.displayName;
  const pageUrl   = data.featuredPage?._metadata?.url?.default;

  const isDev = process.env.NODE_ENV !== "production";
  if (!pageTitle && !isDev) return null;

  return (
    <section className="py-20 px-8 max-w-7xl mx-auto">
      <div className="insight-rail max-w-2xl">
        {data.label && (
          <span
            {...pa("label")}
            className="inline-block text-xs font-semibold uppercase tracking-widest text-brand mb-4"
          >
            {data.label}
          </span>
        )}

        <h2
          {...pa("featuredPage")}
          className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-4"
        >
          {pageTitle ?? (isDev ? "← Set a featured page in the CMS" : null)}
        </h2>

        {data.description && (
          <p
            {...pa("description")}
            className="text-base leading-relaxed text-on-surface-variant mb-8"
          >
            {data.description}
          </p>
        )}

        {(data.ctaText || data.__context?.edit) && (
          <Link
            href={data.__context?.edit ? "#" : (pageUrl ?? "#")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand text-on-brand font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <span {...pa("ctaText")}>{data.ctaText ?? "Read More"}</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}
