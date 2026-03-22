interface SectionHeadingBlockProps {
  heading?: string | null;
  subheading?: string | null;
  inEditMode?: boolean;
}

export default function SectionHeadingBlock({
  heading,
  subheading,
  inEditMode,
}: SectionHeadingBlockProps) {
  return (
    <div className="py-20 max-w-7xl mx-auto px-8">
      <div className="insight-rail max-w-2xl">
        {heading && (
          <h2
            data-epi-edit={inEditMode ? "heading" : undefined}
            className="text-3xl md:text-4xl font-extrabold mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--on-surface)",
            }}
          >
            {heading}
          </h2>
        )}
        {subheading && (
          <p
            data-epi-edit={inEditMode ? "subheading" : undefined}
            className="text-base leading-relaxed"
            style={{ color: "var(--on-surface-variant)" }}
          >
            {subheading}
          </p>
        )}
      </div>
    </div>
  );
}
