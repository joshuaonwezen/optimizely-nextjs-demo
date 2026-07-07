import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  HEADING_SIZE, TEXT_ALIGN, FONT_STYLE, TEXT_SIZE,
  HEADING_CLASSES, TEXT_ALIGN_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

export const FeaturedContentBlockType = contentType({
  key: "FeaturedContentBlock",
  displayName: "Featured Content",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    featuredPage: { type: "contentReference", displayName: "Featured Page", allowedTypes: ["_page"], indexingType: "disabled" },
  },
});

export const FeaturedContentCardTemplate = displayTemplate({
  key: "FeaturedContentCardTemplate",
  isDefault: false,
  displayName: "Card",
  contentType: "FeaturedContentBlock",
  tag: "Card",
  settings: {
    theme: {
      editor: "select" as const,
      displayName: "Background color",
      sortOrder: 0,
      choices: {
        surface: { displayName: "White",         sortOrder: 0 },
        brand:   { displayName: "Blue gradient", sortOrder: 1 },
      },
    },
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
    ...TEXT_SIZE,
  },
});

interface FeaturedPageRef {
  _metadata?: {
    displayName?: string | null;
    url?: { default?: string | null } | null;
  } | null;
}

interface FeaturedContentData {
  featuredPage?: FeaturedPageRef | null;
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

  const headingClass = HEADING_CLASSES[(ds?.headingSize as string) ?? "lg"];
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
  const alignClass = TEXT_ALIGN_CLASSES[(ds?.textAlign as string) ?? "left"];

  const sectionClass = isCard
    ? `rounded-2xl p-10 ${isBrand ? "bg-gradient-brand" : "bg-surface-lowest border border-outline-variant"}`
    : "py-20";
  const innerClass   = isBrand ? "max-w-2xl" : "insight-rail max-w-2xl";
  const headingColor = isBrand ? "text-on-brand" : "text-on-surface";
  const ctaClass     = isBrand
    ? "bg-on-brand text-brand hover:opacity-90 transition-opacity"
    : "bg-brand text-on-brand hover:opacity-90 transition-opacity";

  return (
    <section data-component="FeaturedContentBlock" className={`${sectionClass} ${alignClass}`}>
      <div className={innerClass}>
        <h2
          {...pa("featuredPage")}
          className={`${fontClass} ${headingClass} font-extrabold ${headingColor} mb-4`}
        >
          {pageTitle ?? (isDev ? "Set a featured page in the CMS" : null)}
        </h2>

        {(pageUrl || data.__context?.edit) && (
          <Link
            href={data.__context?.edit ? "#" : (pageUrl ?? "#")}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm ${ctaClass}`}
          >
            <span>Read More</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>
    </section>
  );
}
