import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

const ICON_MAP: Record<string, string> = {
  server: "\u{1F5A5}\uFE0F",
  beaker: "\u{1F9EA}",
  cursor: "\u{1F5B1}\uFE0F",
  chart: "\u{1F4CA}",
};

interface ProductCardData {
  icon?: string | null;
  title?: string | null;
  description?: string | null;
  linkUrl?: { default?: string | null } | null;
  linkText?: string | null;
  __context?: any;
}

type ProductCardBlockProps = ProductCardData & {
  content?: ProductCardData;
};

export default function ProductCardBlock(props: ProductCardBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const href = data.linkUrl?.default ?? "#";
  const iconChar = data.icon ? ICON_MAP[data.icon] ?? "\u{1F537}" : "\u{1F537}";

  return (
    <a
      href={href}
      className="hover-ambient group flex flex-col h-full rounded-2xl p-8 bg-surface-lowest"
    >
      <div className="text-4xl mb-6">{iconChar}</div>
      {data.title && (
        <h3
          {...pa("title")}
          className="text-lg font-bold text-on-surface mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className="text-sm leading-relaxed text-on-surface-variant mb-6 flex-grow"
        >
          {data.description}
        </p>
      )}
      <span
        {...pa("linkText")}
        className="text-sm font-semibold text-brand mt-auto"
      >
        {data.linkText ?? "Learn More \u2192"}
      </span>
    </a>
  );
}
