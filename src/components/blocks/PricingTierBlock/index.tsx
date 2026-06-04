import Link from "next/link";
import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const PricingTierBlockType = contentType({
  key: "PricingTierBlock",
  displayName: "Pricing Tier",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    name:        { type: "string",  displayName: "Tier name" },
    price:       { type: "string",  displayName: "Price (e.g. £0, £9)" },
    period:      { type: "string",  displayName: "Billing period (e.g. /month)" },
    highlighted: { type: "boolean", displayName: "Highlight as recommended" },
    features:    {
      type: "array",
      displayName: "Features",
      items: { type: "string" },
    },
    ctaText:     { type: "string", displayName: "CTA text" },
    ctaLink:     { type: "string", displayName: "CTA link" },
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
};

export default function PricingTierBlock(props: PricingTierBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const features = (data.features ?? []).filter((f): f is string => Boolean(f));

  const wrapperBase =
    "rounded-2xl p-8 border h-full flex flex-col transition-shadow";
  const wrapperStyle = data.highlighted
    ? `${wrapperBase} bg-brand text-on-brand border-brand shadow-lift`
    : `${wrapperBase} bg-surface-lowest border-ghost-border hover-ambient`;

  return (
    <div className={wrapperStyle}>
      {data.highlighted && (
        <span className="inline-block text-xs font-bold uppercase tracking-widest opacity-80 mb-3">
          Recommended
        </span>
      )}
      {data.name && (
        <h3
          {...pa("name")}
          className="font-display text-2xl font-extrabold mb-2"
        >
          {data.name}
        </h3>
      )}
      <div className="flex items-baseline gap-1 mb-6">
        {data.price && (
          <span
            {...pa("price")}
            className="font-display text-5xl font-extrabold"
          >
            {data.price}
          </span>
        )}
        {data.period && (
          <span
            {...pa("period")}
            className={`text-sm ${data.highlighted ? "opacity-80" : "text-on-surface-variant"}`}
          >
            {data.period}
          </span>
        )}
      </div>

      {features.length > 0 && (
        <ul {...pa("features")} className="space-y-3 mb-8 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                className={`flex-shrink-0 mt-0.5 ${data.highlighted ? "" : "text-brand"}`}
              >
                <path d="M3 8L7 12L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {data.ctaText && data.ctaLink && (
        <Link
          href={data.ctaLink}
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity ${
            data.highlighted
              ? "bg-on-brand text-brand hover:opacity-90"
              : "bg-brand text-on-brand hover:opacity-90"
          }`}
        >
          <span {...pa("ctaText")}>{data.ctaText}</span>
        </Link>
      )}
    </div>
  );
}
