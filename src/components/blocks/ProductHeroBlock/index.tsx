import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface ProductHeroData {
  badge?: string | null;
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: { default?: string | null } | null;
  __context?: any;
}

type ProductHeroBlockProps = ProductHeroData & {
  content?: ProductHeroData;
  displaySettings?: Record<string, string | boolean>;
};

export default function ProductHeroBlock(props: ProductHeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const isCompact = ds?.height === "compact";
  const isCentered = ds?.alignment === "center";

  return (
    <section
      {...pa((data as any).__composition)}
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
          {data.ctaUrl?.default && (
            <a
              href={data.ctaUrl.default}
              className="hover-lift font-display inline-block px-8 py-3.5 rounded-lg font-semibold bg-surface-lowest text-brand"
            >
              {data.ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
