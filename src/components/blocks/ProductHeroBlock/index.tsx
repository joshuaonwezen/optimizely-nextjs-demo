import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { ProductHeroCtaClient } from "./ProductHeroCtaClient";

export const ProductHeroBlockType = contentType({
  key: "ProductHeroBlock",
  displayName: "Product Hero",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    badge: { type: "string", displayName: "Badge Text" },
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description", indexingType: "searchable" },
    ctaText: { type: "string", displayName: "CTA Text" },
    ctaUrl: { type: "url", displayName: "CTA URL" },
  },
});

export const ProductHeroCompactTemplate = displayTemplate({
  key: "ProductHeroCompactTemplate",
  isDefault: false,
  displayName: "Compact Product Hero",
  contentType: "ProductHeroBlock",
  tag: "Compact",
  settings: {
    alignment: {
      editor: "select",
      displayName: "Text Alignment",
      sortOrder: 0,
      choices: {
        left: { displayName: "Left", sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
      },
    },
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
};

export default async function ProductHeroBlock(props: ProductHeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCompact = ds?.height === "compact";
  const isCentered = ds?.alignment === "center";

  return (
    <section
      className={`w-screen ml-[calc(50%-50vw)] bg-gradient-brand ${isCompact ? "py-16 md:py-20" : "py-28 md:py-36"}`}
    >
      <div className={`max-w-7xl mx-auto px-8 ${isCentered ? "text-center" : ""}`}>
        <div className={isCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {data.badge && (
            <span
              {...pa("badge")}
              className="inline-block font-body text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 text-on-brand bg-badge-bg"
            >
              {data.badge}
            </span>
          )}
          {data.title && (
            <h1
              {...pa("title")}
              className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
            >
              {data.title}
            </h1>
          )}
          {data.description && (
            <p
              {...pa("description")}
              className="text-lg md:text-xl mb-12 max-w-2xl leading-relaxed text-on-brand-muted"
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
