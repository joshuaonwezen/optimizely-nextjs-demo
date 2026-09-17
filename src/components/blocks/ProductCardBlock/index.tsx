import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { resolveLinkHref } from "@/lib/optimizely/resolveLinkHref";
import type { ReactNode } from "react";
import {
  BACKGROUND, TEXT_COLOR, HEADING_SIZE_CARD, FONT_STYLE, isChecked, resolveStyleClasses,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Product-card titles sit in a narrow column, so they render one step smaller than
// the shared HEADING_CLASSES scale — otherwise a long word ("Current Account")
// overflows and clips at the card edge. Keyed by the same headingSize choices so
// the display-template option still works if an editor picks a size.
const CARD_HEADING_CLASSES: Record<string, string> = {
  xl: "text-3xl md:text-4xl",
  lg: "text-2xl md:text-3xl",
  md: "text-xl md:text-2xl",
  sm: "text-lg md:text-xl",
};

export const ProductCardBlockType = contentType({
  key: "ProductCardBlock",
  displayName: "Product Card",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    icon: { type: "string", displayName: "Icon Name" },
    title: { type: "string", displayName: "Title", indexingType: "searchable", isLocalized: true },
    description: { type: "string", displayName: "Description", indexingType: "searchable", isLocalized: true },
    linkUrl: { type: "url", displayName: "Link URL" },
    linkText: { type: "string", displayName: "Link Text", isLocalized: true },
  },
});

// "Highlight card" replaces the old "Featured (highlighted)" template. The icon
// control is "Hide icon" so an untouched checkbox (stored "False") keeps the icon.
export const ProductCardDefaultTemplate = displayTemplate({
  key: "ProductCardDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "ProductCardBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...HEADING_SIZE_CARD,
    ...FONT_STYLE,
    featured: {
      editor: "checkbox" as const,
      displayName: "Highlight card",
      sortOrder: 10,
      choices: {},
    },
    hideIcon: {
      editor: "checkbox" as const,
      displayName: "Hide icon",
      sortOrder: 11,
      choices: {},
    },
  },
});

const ICON_MAP: Record<string, ReactNode> = {
  account: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h3" />
      <path d="M13 15h5" />
    </svg>
  ),
  savings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,18 9,12 13,14 19,7" />
      <polyline points="15,7 19,7 19,11" />
    </svg>
  ),
  mortgage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 4l9 8" />
      <path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  ),
  business: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
};

interface ProductCardData {
  icon?: string | null;
  title?: string | null;
  description?: string | null;
  linkUrl?: { default?: string | null; hierarchical?: string | null } | null;
  linkText?: string | null;
  __context?: { edit?: boolean } | null;
}

type ProductCardBlockProps = ProductCardData & {
  content?: ProductCardData;
  displaySettings?: Record<string, string | boolean>;
};

export default async function ProductCardBlock(props: ProductCardBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));
  // No "#" fallback: an unset or unresolvable link renders a non-navigating card.
  const href = data.__context?.edit ? undefined : await resolveLinkHref(data.linkUrl);
  const icon = data.icon ? (ICON_MAP[data.icon] ?? ICON_MAP.account) : ICON_MAP.account;

  const isFeatured = isChecked(ds, "featured");
  const showIcon = !isChecked(ds, "hideIcon");
  const bg = resolveStyleClasses(ds, { background: "white" });
  const isInverted = bg.invert;

  const featuredClass = isFeatured ? "ring-2 ring-brand/30 shadow-ambient" : "";
  const headingClass = CARD_HEADING_CLASSES[(ds?.headingSize as string) || "md"] ?? CARD_HEADING_CLASSES.md;

  const iconBgClass = isInverted ? "bg-on-brand/10 text-on-brand" : "bg-brand/10 text-brand";
  const linkClass   = isInverted ? bg.text : "text-brand";

  return (
    <a
      data-component="ProductCardBlock"
      href={href}
      data-track-event="mb_product_card_click"
      data-track-tags={JSON.stringify({ title: data.title ?? "", featured: isFeatured })}
      className={`hover-ambient group flex flex-col h-full rounded-2xl p-8 ${bg.wrapper} ${featuredClass}`.trim()}
    >
      {showIcon && (
        <div className={`w-12 h-12 mb-6 rounded-control flex items-center justify-center p-3 shrink-0 ${iconBgClass}`}>
          {icon}
        </div>
      )}
      {data.title && (
        <h3
          {...pa("title")}
          className={`${bg.font} ${headingClass} font-bold mb-3 break-words hyphens-auto ${bg.text}`}
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className={`text-sm leading-relaxed mb-6 flex-grow ${bg.textMuted}`}
        >
          {data.description}
        </p>
      )}
      <span
        {...pa("linkText")}
        className={`text-sm font-semibold mt-auto ${linkClass}`}
      >
        {data.linkText ?? "Learn More →"}
      </span>
    </a>
  );
}
