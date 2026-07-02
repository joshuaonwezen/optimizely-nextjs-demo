import Link from "next/link";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, FONT_STYLE,
  BG_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

export const PricingTierBlockType = contentType({
  key: "PricingTierBlock",
  displayName: "Pricing Tier",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
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
    ctaText:     { type: "string", displayName: "CTA text", isLocalized: true },
    ctaLink:     { type: "string", displayName: "CTA link" },
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
  ctaLink?:     string | null;
  __context?: { edit?: boolean } | null;
}

type PricingTierBlockProps = PricingTierData & {
  content?: PricingTierData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function PricingTierBlock(props: PricingTierBlockProps) {
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
  const bg = bgKey ? BG_CLASSES[bgKey] : null;

  let wrapperStyle: string;
  if (bg) {
    wrapperStyle = `rounded-2xl ${padding} border h-full flex flex-col transition-shadow ${bg.wrapper}`;
  } else {
    wrapperStyle = data.highlighted
      ? `rounded-2xl ${padding} border h-full flex flex-col transition-shadow bg-brand text-on-brand border-brand shadow-lift`
      : `rounded-2xl ${padding} border h-full flex flex-col transition-shadow bg-surface-lowest border-ghost-border hover-ambient`;
  }

  const textColor = bg ? bg.text : (data.highlighted ? "text-on-brand" : "text-on-surface");
  const mutedColor = bg ? bg.textMuted : (data.highlighted ? "opacity-80" : "text-on-surface-variant");
  const ctaClass = bg?.wrapper?.includes("gradient") || (data.highlighted && !bg)
    ? "bg-on-brand text-brand hover:opacity-90"
    : "bg-brand text-on-brand hover:opacity-90";

  return (
    <div data-component="PricingTierBlock" className={wrapperStyle}>
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

      {data.ctaText && data.ctaLink && (
        <Link
          href={data.ctaLink}
          data-track-event="mb_pricing_tier_click"
          data-track-tags={JSON.stringify({ tier: data.name ?? "", label: data.ctaText ?? "", highlighted: !!data.highlighted })}
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity ${ctaClass}`}
        >
          <span {...pa("ctaText")}>{data.ctaText}</span>
        </Link>
      )}
    </div>
  );
}
