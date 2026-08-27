import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_COLOR, HEADING_SIZE_CARD, TEXT_ALIGN, FONT_STYLE, FONT_CLASSES, HEADING_CLASSES, TEXT_ALIGN_CLASSES,
} from "../_shared/displayTemplateSettings";
import { Button } from "@/components/ui/Button";

export const FeaturedContentBlockType = contentType({
  key: "FeaturedContentBlock",
  displayName: "Featured Content",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    // Omit indexingType: "disabled" drops the ref from the SDK query, so the page
    // never arrives at render (see CLAUDE.md). Omit it so Graph returns { _metadata: { url } }.
    featuredPage: { type: "contentReference", displayName: "Featured Page", allowedTypes: ["_page"] },
  },
});

export const FeaturedContentBlockDefaultTemplate = displayTemplate({
  key: "FeaturedContentBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "FeaturedContentBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
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
      sortOrder: 10,
      choices: {
        surface: { displayName: "White",         sortOrder: 0 },
        brand:   { displayName: "Green",         sortOrder: 1 },
      },
    },
    ...TEXT_COLOR,
    ...HEADING_SIZE_CARD,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
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

  // Card surface goes on an absolute `.squircle-bg` layer so the mask shapes the
  // card without clipping the heading/button above it.
  const surfaceClass = isBrand ? "bg-gradient-brand" : "bg-surface-lowest border border-outline-variant";
  const innerClass   = isBrand ? "max-w-2xl" : "insight-rail max-w-2xl";
  const headingColor = isBrand ? "text-on-brand" : "text-on-surface";

  return (
    <section data-component="FeaturedContentBlock" className={`relative ${isCard ? "" : "py-20"} ${alignClass}`}>
      {isCard && (
        <div aria-hidden className={`squircle-bg absolute inset-0 ${surfaceClass}`} />
      )}
      <div className={`relative ${isCard ? "p-10" : ""} ${innerClass}`}>
        <h2
          {...pa("featuredPage")}
          className={`${fontClass} ${headingClass} font-extrabold ${headingColor} mb-4`}
        >
          {pageTitle ?? (isDev ? "Set a featured page in the CMS" : null)}
        </h2>

        {(pageUrl || data.__context?.edit) && (
          <Button
            href={data.__context?.edit ? "#" : (pageUrl ?? "#")}
            size="compact"
            variant={isBrand ? "custom" : "primary"}
            className={isBrand ? "bg-on-brand text-brand hover:opacity-90" : undefined}
          >
            <span>Read More</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        )}
      </div>
    </section>
  );
}
