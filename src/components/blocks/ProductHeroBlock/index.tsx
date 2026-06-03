import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { getDecision, bucketVisitor } from "@/lib/optimizely/experimentation";
import { getVisitorContext } from "@/lib/optimizely/visitor";

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

// Map FX button_color variable values to Tailwind classes
const COLOR_CLASSES: Record<string, string> = {
  blue:   "bg-blue-600 text-white",
  green:  "bg-green-600 text-white",
  red:    "bg-red-600 text-white",
  purple: "bg-purple-600 text-white",
  amber:  "bg-amber-500 text-white",
};

// Map FX button_style variable values to modifier classes
const STYLE_MODIFIERS: Record<string, string> = {
  outline: "!bg-transparent border-2 border-current",
  filled:  "",
};

export default async function ProductHeroBlock(props: ProductHeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCompact = ds?.height === "compact";
  const isCentered = ds?.alignment === "center";

  // Evaluate add_to_cart FX flag — drives button colour + style
  const { userId } = await getVisitorContext();
  const fxDecision = await getDecision("add_to_cart", userId);

  const fxColor = fxDecision.enabled ? (fxDecision.variables.button_color as string) : undefined;
  const fxStyle = fxDecision.enabled ? (fxDecision.variables.button_style as string) : undefined;
  if (fxDecision.enabled) void bucketVisitor("add_to_cart", userId);

  const ctaColorClass = (fxColor && COLOR_CLASSES[fxColor]) || "bg-surface-lowest text-brand";
  const ctaStyleMod   = (fxStyle && STYLE_MODIFIERS[fxStyle]) || "";
  const ctaClass = `hover-lift font-display inline-block px-8 py-3.5 rounded-lg font-semibold ${ctaColorClass} ${ctaStyleMod}`.trim();

  return (
    <section
      className={`bg-gradient-brand ${isCompact ? "py-16 md:py-20" : "py-28 md:py-36"}`}
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
            <div>
              <a
                href={data.__context?.edit ? undefined : (data.ctaUrl?.default ?? undefined)}
                className={ctaClass}
              >
                <span {...pa("ctaText")}>{data.ctaText ?? "Learn More"}</span>
              </a>
              {data.__context?.edit && (
                <p
                  {...pa("ctaUrl")}
                  className="mt-2 text-xs font-mono text-on-brand-subtle/70 cursor-pointer hover:text-on-brand-subtle transition-colors"
                >
                  {data.ctaUrl?.default || "Click to set CTA URL…"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
