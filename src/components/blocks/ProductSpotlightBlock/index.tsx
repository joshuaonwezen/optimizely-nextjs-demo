import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { Button } from "@/components/ui/Button";
import { asSdkContent } from "@/components/cms/sdkTypes";
import { CATEGORY_LABELS, formatRate, getProduct, productCatalog } from "@/lib/catalog/products";
import { formatDate } from "@/lib/formatDate";

export const ProductSpotlightType = contentType({
  key: "ProductSpotlight",
  displayName: "Product Spotlight",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    // The type's ONLY long string (a string with no format). CMS property editors mount
    // on long strings only, and the Product picker extension turns the field into a
    // catalog dropdown on this content type alone. Keep every other text field
    // shortString so it keeps the CMS's own input.
    productId: {
      type: "string",
      displayName: "Product",
      description: "The catalog product to feature. Name, rate and link always come from the catalog.",
      sortOrder: 10,
    },
    heading: {
      type: "string",
      format: "shortString",
      displayName: "Heading (optional)",
      description: "Replaces the product name.",
      isLocalized: true,
      sortOrder: 20,
    },
    ctaText: {
      type: "string",
      format: "shortString",
      displayName: "Button text (optional)",
      isLocalized: true,
      sortOrder: 30,
    },
  },
});

interface ProductSpotlightData {
  productId?: string | null;
  heading?: string | null;
  ctaText?: string | null;
  __context?: { edit?: boolean } | null;
}

type ProductSpotlightBlockProps = ProductSpotlightData & { content?: ProductSpotlightData };

export default function ProductSpotlightBlock(props: ProductSpotlightBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const product = getProduct(data.productId);

  if (!product) {
    // Visitors never see an empty card; editors see what to fix.
    if (!data.__context?.edit) return null;
    return (
      <div
        data-component="ProductSpotlightBlock"
        {...pa("productId")}
        className="rounded-2xl border-2 border-dashed border-ghost-border p-8 text-sm text-on-surface-variant"
      >
        {data.productId
          ? `No product "${data.productId}" in the catalog. Pick another in the Product field.`
          : "Pick a product in the Product field."}
      </div>
    );
  }

  const updated = formatDate(productCatalog().updatedAt);

  return (
    <section
      data-component="ProductSpotlightBlock"
      className="flex flex-col h-full gap-4 rounded-2xl border border-ghost-border bg-surface-lowest p-8"
    >
      <p {...pa("productId")} className="text-xs font-semibold uppercase tracking-wider text-brand">
        {CATEGORY_LABELS[product.category]}
      </p>
      <h3 {...pa("heading")} className="font-display text-2xl md:text-3xl font-bold text-on-surface">
        {data.heading || product.name}
      </h3>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-5xl font-bold text-on-surface">{formatRate(product.rate)}</span>
        <span className="text-sm font-semibold text-on-surface-variant">
          {product.rate.label}, {product.rate.basis}
        </span>
      </p>
      {product.rate.note && <p className="text-xs text-on-surface-variant">{product.rate.note}</p>}
      <p className="text-sm leading-relaxed text-on-surface-variant">{product.summary}</p>
      {product.features.length > 0 && (
        <ul className="space-y-1.5 text-sm text-on-surface">
          {product.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="text-brand">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto pt-2">
        <Button
          href={product.url}
          size="compact"
          pill
          data-track-event="mb_product_spotlight_click"
          data-track-tags={JSON.stringify({ product: product.id })}
        >
          <span {...pa("ctaText")}>{data.ctaText || `View ${product.name}`}</span>
        </Button>
      </div>
      {updated && <p className="text-xs text-on-surface-variant">Rates as of {updated}.</p>}
    </section>
  );
}
