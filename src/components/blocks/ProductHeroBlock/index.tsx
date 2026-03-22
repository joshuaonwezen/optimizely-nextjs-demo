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
};

export default function ProductHeroBlock(props: ProductHeroBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <section
      className="py-28 md:py-36"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="max-w-3xl">
          {data.badge && (
            <span
              {...pa("badge")}
              className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 text-on-brand"
              style={{
                fontFamily: "var(--font-body)",
                background: "rgba(242, 241, 255, 0.15)",
              }}
            >
              {data.badge}
            </span>
          )}
          {data.title && (
            <h1
              {...pa("title")}
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.title}
            </h1>
          )}
          {data.description && (
            <p
              {...pa("description")}
              className="text-lg md:text-xl mb-12 max-w-2xl leading-relaxed"
              style={{ color: "rgba(242, 241, 255, 0.80)" }}
            >
              {data.description}
            </p>
          )}
          {data.ctaUrl?.default && (
            <a
              href={data.ctaUrl.default}
              className="hover-lift inline-block px-8 py-3.5 rounded-lg font-semibold bg-surface-lowest text-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {data.ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
