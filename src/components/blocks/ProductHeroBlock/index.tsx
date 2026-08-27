import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND_BRAND_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { ProductHeroCtaClient } from "./ProductHeroCtaClient";

export const ProductHeroBlockType = contentType({
  key: "ProductHeroBlock",
  displayName: "Product Hero",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    badge: { type: "string", displayName: "Badge Text", isLocalized: true },
    title: { type: "string", displayName: "Title", indexingType: "searchable", isLocalized: true },
    description: { type: "string", displayName: "Description", indexingType: "searchable", isLocalized: true },
    ctaText: { type: "string", displayName: "CTA Text", isLocalized: true },
    ctaUrl: { type: "url", displayName: "CTA URL" },
  },
});

export const ProductHeroBlockDefaultTemplate = displayTemplate({
  key: "ProductHeroBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "ProductHeroBlock",
  settings: {
    ...BACKGROUND_BRAND_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

export const ProductHeroCompactTemplate = displayTemplate({
  key: "ProductHeroCompactTemplate",
  isDefault: false,
  displayName: "Compact (reduced height)",
  contentType: "ProductHeroBlock",
  tag: "Compact",
  settings: {
    alignment: {
      editor: "select",
      displayName: "Text alignment",
      sortOrder: 10,
      choices: {
        left: { displayName: "Left", sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
      },
    },
    ...BACKGROUND_BRAND_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface ProductHeroData {
  badge?: string | null;
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: { default?: string | null } | null;
  __context?: { edit?: boolean } | null;
}

type ProductHeroBlockProps = ProductHeroData & {
  content?: ProductHeroData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default async function ProductHeroBlock(props: ProductHeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCompact = props.displayTemplateKey === "ProductHeroCompactTemplate";
  const isCentered = ds?.alignment === "center";
  const style = resolveStyleClasses(ds, { background: "blueGrad" });

  return (
    <section
      data-component="ProductHeroBlock"
      data-track-view="ProductHeroBlock"
      className={`w-screen ml-[calc(50%-50vw)] ${style.wrapper} ${isCompact ? "py-16 md:py-20" : "py-28 md:py-36"}`}
    >
      <div className={`max-w-7xl mx-auto px-8 ${isCentered ? "text-center" : ""}`}>
        <div className={isCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {data.badge && (
            <span
              {...pa("badge")}
              className={`inline-block font-body text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 ${style.text} bg-badge-bg`}
            >
              {data.badge}
            </span>
          )}
          {data.title && (
            <h1
              {...pa("title")}
              className={`${style.font} text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 ${style.text}`}
            >
              {data.title}
            </h1>
          )}
          {data.description && (
            <p
              {...pa("description")}
              className={`text-lg md:text-xl mb-12 max-w-2xl leading-relaxed ${style.textMuted}`}
            >
              {data.description}
            </p>
          )}
          {(data.ctaUrl?.default || data.__context?.edit) && (
            <ProductHeroCtaClient
              href={data.ctaUrl?.default}
              label={data.ctaText}
              isEditMode={!!data.__context?.edit}
              ctaUrlDisplay={data.ctaUrl?.default}
              paAttrs={pa("ctaText") as Record<string, string>}
              paUrlAttrs={pa("ctaUrl") as Record<string, string>}
            />
          )}
        </div>
      </div>
    </section>
  );
}
