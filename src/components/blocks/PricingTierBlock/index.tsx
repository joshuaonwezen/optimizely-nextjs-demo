import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, TEXT_COLOR, FONT_STYLE, FONT_CLASSES, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { resolveLinkHref } from "@/lib/optimizely/resolveLinkHref";
import { Button } from "@/components/ui/Button";

export const PricingTierBlockType = contentType({
  key: "PricingTierBlock",
  displayName: "Pricing Tier",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    name:        { type: "string",  displayName: "Tier name",                  isLocalized: true },
    price:       { type: "string",  displayName: "Price (e.g. £0, £9)" },
    period:      { type: "string",  displayName: "Billing period (e.g. /month)", isLocalized: true },
    highlighted: { type: "boolean", displayName: "Highlight as recommended" },
    features:    {
      type: "array",
      displayName: "Features",
      isLocalized: true,
      items: { type: "string" },
    },
    ctaText:     { type: "string", displayName: "CTA text", isLocalized: true, sortOrder: 100 },
    // Native link picker: internal page selection + external/anchor/email URLs.
    // Resolve at render with resolveLinkHref() (internal refs come back as cms://).
    ctaLink:     { type: "url", displayName: "Link", sortOrder: 110 },
  },
});

export const PricingTierBlockDefaultTemplate = displayTemplate({
  key: "PricingTierBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "PricingTierBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

export const PricingTierCompactTemplate = displayTemplate({
  key: "PricingTierCompactTemplate",
  isDefault: false,
  displayName: "Compact",
  contentType: "PricingTierBlock",
  tag: "Compact",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface PricingTierData {
  name?:        string | null;
  price?:       string | null;
  period?:      string | null;
  highlighted?: boolean | null;
  features?:    Array<string | null> | null;
  ctaText?:     string | null;
  // type:"url" link — Graph returns { default, hierarchical }.
  ctaLink?:     { default?: string | null; hierarchical?: string | null } | null;
  __context?: { edit?: boolean } | null;
}

type PricingTierBlockProps = PricingTierData & {
  content?: PricingTierData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default async function PricingTierBlock(props: PricingTierBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const features = (data.features ?? []).filter((f): f is string => Boolean(f));

  const isCompact = props.displayTemplateKey === "PricingTierCompactTemplate";
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
  const padding = isCompact ? "p-5" : "p-8";
  const nameSize = isCompact ? "text-lg" : "text-2xl";
  const priceSize = isCompact ? "text-3xl" : "text-5xl";
  const featureSpacing = isCompact ? "space-y-1.5 mb-5" : "space-y-3 mb-8";

  const bgKey = (ds?.background as string) || "";
  // Highlighted (recommended) tiers always take the brand treatment, even when a
  // background is set — the CMS materializes "White" as the default background, which
  // would otherwise silently override the highlight and flatten the recommended tier.
  const bg = !data.highlighted && bgKey ? resolveStyleClasses(ds, { background: bgKey }) : null;

  // Surface classes live on an absolute background layer (`.squircle-bg`) so the
  // superellipse mask shapes the card without clipping the content above it.
  let surfaceClass: string;
  if (bg) {
    surfaceClass = `border transition-shadow ${bg.wrapper}`;
  } else {
    surfaceClass = data.highlighted
      ? "border transition-shadow bg-brand-fill border-brand"
      : "border transition-shadow bg-surface-lowest border-ghost-border";
  }

  const textColor = bg ? bg.text : (data.highlighted ? "text-on-brand" : "text-on-surface");
  const mutedColor = bg ? bg.textMuted : (data.highlighted ? "opacity-80" : "text-on-surface-variant");
  const ctaIsDarkChip = bg?.wrapper?.includes("gradient") || (data.highlighted && !bg);

  // Resolve the link picker (internal refs come back as cms://content/{key}).
  const resolved = await resolveLinkHref(data.ctaLink);
  const isEdit = !!data.__context?.edit;
  const href = isEdit ? undefined : resolved;

  return (
    <div data-component="PricingTierBlock" className="relative h-full">
      <div aria-hidden className={`squircle-bg absolute inset-0 ${surfaceClass}`} />
      <div className={`relative ${padding} h-full flex flex-col`}>
      {data.highlighted && !bg && (
        <span className="inline-block text-xs font-bold uppercase tracking-widest opacity-80 mb-3">
          Recommended
        </span>
      )}
      {data.name && (
        <h3
          {...pa("name")}
          className={`${fontClass} ${nameSize} font-extrabold mb-2 ${textColor}`}
        >
          {data.name}
        </h3>
      )}
      <div className="flex items-baseline gap-1 mb-6">
        {data.price && (
          <span
            {...pa("price")}
            className={`${fontClass} ${priceSize} font-extrabold ${textColor}`}
          >
            {data.price}
          </span>
        )}
        {data.period && (
          <span
            {...pa("period")}
            className={`text-sm ${mutedColor}`}
          >
            {data.period}
          </span>
        )}
      </div>

      {features.length > 0 && (
        <ul {...pa("features")} className={`${featureSpacing} flex-1`}>
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className={`flex-shrink-0 mt-0.5 ${data.highlighted && !bg ? "" : "text-brand"}`}
              >
                <path d="M3 8L7 12L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className={textColor}>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {data.ctaText && (href || isEdit) && (
        <Button
          href={isEdit ? undefined : href}
          size="compact"
          fontClassName=""
          variant={ctaIsDarkChip ? "custom" : "primary"}
          className={ctaIsDarkChip ? "bg-on-brand text-brand hover:opacity-90" : undefined}
          data-track-event="mb_pricing_tier_click"
          data-track-tags={JSON.stringify({ tier: data.name ?? "", label: data.ctaText ?? "", highlighted: !!data.highlighted })}
          {...pa("ctaLink")}
        >
          <span {...pa("ctaText")}>{data.ctaText}</span>
        </Button>
      )}
      </div>
    </div>
  );
}
