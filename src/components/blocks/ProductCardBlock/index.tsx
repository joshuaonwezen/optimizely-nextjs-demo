import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import type { ReactNode } from "react";

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

export const ProductCardFeaturedTemplate = displayTemplate({
  key: "ProductCardFeaturedTemplate",
  isDefault: false,
  displayName: "Featured (highlighted)",
  contentType: "ProductCardBlock",
  tag: "Featured",
  settings: {
    showIcon: {
      editor: "checkbox",
      displayName: "Show icon",
      sortOrder: 0,
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
  linkUrl?: { default?: string | null } | null;
  linkText?: string | null;
  __context?: any;
}

type ProductCardBlockProps = ProductCardData & {
  content?: ProductCardData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function ProductCardBlock(props: ProductCardBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const href = data.__context?.edit ? undefined : (data.linkUrl?.default ?? "#");
  const icon = data.icon ? (ICON_MAP[data.icon] ?? ICON_MAP.account) : ICON_MAP.account;

  const isFeatured = props.displayTemplateKey === "ProductCardFeaturedTemplate";
  const showIcon = ds?.showIcon !== false;

  return (
    <a
      data-component="ProductCardBlock"
      href={href}
      className={`hover-ambient group flex flex-col h-full rounded-2xl p-8 ${isFeatured ? "bg-secondary-container ring-2 ring-brand/30 shadow-ambient" : "bg-surface-lowest"}`}
    >
      {showIcon && (
        <div className="w-12 h-12 mb-6 rounded-xl bg-brand/10 text-brand flex items-center justify-center p-3 shrink-0">
          {icon}
        </div>
      )}
      {data.title && (
        <h3
          {...pa("title")}
          className="font-display text-lg font-bold text-on-surface mb-3"
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className="text-sm leading-relaxed text-on-surface-variant mb-6 flex-grow"
        >
          {data.description}
        </p>
      )}
      <span
        {...pa("linkText")}
        className="text-sm font-semibold text-brand mt-auto"
      >
        {data.linkText ?? "Learn More \u2192"}
      </span>
    </a>
  );
}
