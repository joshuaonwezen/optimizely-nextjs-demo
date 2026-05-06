import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const ProductCardBlockType = contentType({
  key: "ProductCardBlock",
  displayName: "Product Card",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    icon: { type: "string", displayName: "Icon Name" },
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description", indexingType: "searchable" },
    linkUrl: { type: "url", displayName: "Link URL" },
    linkText: { type: "string", displayName: "Link Text" },
  },
});

export const ProductCardFeaturedTemplate = displayTemplate({
  key: "ProductCardFeaturedTemplate",
  isDefault: false,
  displayName: "Featured Product Card",
  contentType: "ProductCardBlock",
  tag: "Featured",
  settings: {
    showIcon: {
      editor: "checkbox",
      displayName: "Show Icon",
      sortOrder: 0,
      choices: {},
    },
  },
});

const ICON_MAP: Record<string, string> = {
  server: "\u{1F5A5}\uFE0F",
  beaker: "\u{1F9EA}",
  cursor: "\u{1F5B1}\uFE0F",
  chart: "\u{1F4CA}",
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
  const iconChar = data.icon ? ICON_MAP[data.icon] ?? "\u{1F537}" : "\u{1F537}";

  const isFeatured = props.displayTemplateKey === "ProductCardFeaturedTemplate";
  const showIcon = ds?.showIcon !== false;

  return (
    <a
      href={href}
      className={`hover-ambient group flex flex-col h-full rounded-2xl p-8 bg-surface-lowest ${isFeatured ? "ring-2 ring-brand/20 shadow-ambient" : ""}`}
    >
      {showIcon && <div className="text-4xl mb-6">{iconChar}</div>}
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
