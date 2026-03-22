const ICON_MAP: Record<string, string> = {
  server: "\u{1F5A5}\uFE0F",
  beaker: "\u{1F9EA}",
  cursor: "\u{1F5B1}\uFE0F",
  chart: "\u{1F4CA}",
};

interface ProductCardBlockProps {
  icon?: string | null;
  title?: string | null;
  description?: string | null;
  linkUrl?: { default?: string | null } | null;
  linkText?: string | null;
  inEditMode?: boolean;
}

export default function ProductCardBlock({
  icon,
  title,
  description,
  linkUrl,
  linkText,
  inEditMode,
}: ProductCardBlockProps) {
  const href = linkUrl?.default ?? "#";
  const iconChar = icon ? ICON_MAP[icon] ?? "\u{1F537}" : "\u{1F537}";

  return (
    <a
      href={href}
      className="hover-ambient group flex flex-col h-full rounded-2xl p-8 bg-surface-lowest"
    >
      <div className="text-4xl mb-6">{iconChar}</div>
      {title && (
        <h3
          data-epi-edit={inEditMode ? "title" : undefined}
          className="text-lg font-bold text-on-surface mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          data-epi-edit={inEditMode ? "description" : undefined}
          className="text-sm leading-relaxed text-on-surface-variant mb-6 flex-grow"
        >
          {description}
        </p>
      )}
      <span
        data-epi-edit={inEditMode ? "linkText" : undefined}
        className="text-sm font-semibold text-brand mt-auto"
      >
        {linkText ?? "Learn More \u2192"}
      </span>
    </a>
  );
}
