interface ProductHeroBlockProps {
  badge?: string | null;
  title?: string | null;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: { default?: string | null } | null;
  inEditMode?: boolean;
}

export default function ProductHeroBlock({
  badge,
  title,
  description,
  ctaText,
  ctaUrl,
  inEditMode,
}: ProductHeroBlockProps) {
  return (
    <section
      className="py-28 md:py-36"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="max-w-3xl">
          {badge && (
            <span
              data-epi-edit={inEditMode ? "badge" : undefined}
              className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-8 text-on-brand"
              style={{
                fontFamily: "var(--font-body)",
                background: "rgba(242, 241, 255, 0.15)",
              }}
            >
              {badge}
            </span>
          )}
          {title && (
            <h1
              data-epi-edit={inEditMode ? "title" : undefined}
              className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {title}
            </h1>
          )}
          {description && (
            <p
              data-epi-edit={inEditMode ? "description" : undefined}
              className="text-lg md:text-xl mb-12 max-w-2xl leading-relaxed"
              style={{ color: "rgba(242, 241, 255, 0.80)" }}
            >
              {description}
            </p>
          )}
          {ctaUrl?.default && (
            <a
              href={ctaUrl.default}
              className="hover-lift inline-block px-8 py-3.5 rounded-lg font-semibold bg-surface-lowest text-brand"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {ctaText ?? "Learn More"}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
