import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FeaturedContentBlockType = contentType({
  key: "FeaturedContentBlock",
  displayName: "Featured Content",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label:        { type: "string",           displayName: "Label (e.g. Case Study, Featured Article)", isLocalized: true },
    featuredPage: { type: "contentReference", displayName: "Featured Page", allowedTypes: ["_page"], indexingType: "disabled" },
    description:  { type: "string",           displayName: "Override Description", indexingType: "searchable", isLocalized: true },
    ctaText:      { type: "string",           displayName: "CTA Button Text", isLocalized: true },
  },
});

export const FeaturedContentCardTemplate = displayTemplate({
  key: "FeaturedContentCardTemplate",
  isDefault: false,
  displayName: "Card (with background)",
  contentType: "FeaturedContentBlock",
  tag: "Card",
  settings: {
    theme: {
      editor: "select" as const,
      displayName: "Background color",
      sortOrder: 0,
      choices: {
        surface: { displayName: "Surface (white)", sortOrder: 0 },
        brand:   { displayName: "Brand blue",      sortOrder: 1 },
      },
    },
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
  displayTemplateKey?: string;
};

export default function FeaturedContentBlock(props: FeaturedContentBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const pageTitle = data.featuredPage?._metadata?.displayName;
  const pageUrl   = data.featuredPage?._metadata?.url?.default;

  const isDev = process.env.NODE_ENV !== "production";
  if (!pageTitle && !isDev) return null;

  const isCard   = props.displayTemplateKey === "FeaturedContentCardTemplate";
  const isBrand  = isCard && ds?.theme === "brand";

  const sectionClass = isCard
    ? `rounded-2xl p-10 ${isBrand ? "bg-gradient-brand" : "bg-surface-lowest border border-ghost-border"}`
    : "py-20";
  const innerClass   = isBrand ? "max-w-2xl" : "insight-rail max-w-2xl";
  const labelColor   = isBrand ? "text-on-brand/70" : "text-brand";
  const headingColor = isBrand ? "text-on-brand" : "text-on-surface";
  const bodyColor    = isBrand ? "text-on-brand/80" : "text-on-surface-variant";
  const ctaClass     = isBrand
    ? "bg-on-brand text-brand hover:opacity-90 transition-opacity"
    : "bg-brand text-on-brand hover:opacity-90 transition-opacity";

  return (
    <section data-component="FeaturedContentBlock" className={sectionClass}>
      <div className={innerClass}>
        {data.label && (
          <span
            {...pa("label")}
            className={`inline-block text-xs font-semibold uppercase tracking-widest ${labelColor} mb-4`}
          >
            {data.label}
          </span>
        )}

        <h2
          {...pa("featuredPage")}
          className={`font-display text-3xl md:text-4xl font-extrabold ${headingColor} mb-4`}
        >
          {pageTitle ?? (isDev ? "← Set a featured page in the CMS" : null)}
        </h2>

        {data.description && (
          <p
            {...pa("description")}
            className={`text-base leading-relaxed ${bodyColor} mb-8`}
          >
            {data.description}
          </p>
        )}

        {(data.ctaText || data.__context?.edit) && (
          <Link
            href={data.__context?.edit ? "#" : (pageUrl ?? "#")}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm ${ctaClass}`}
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
