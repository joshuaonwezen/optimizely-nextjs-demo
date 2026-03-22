interface FeatureItemBlockProps {
  title?: string | null;
  description?: string | null;
  inEditMode?: boolean;
}

export default function FeatureItemBlock({
  title,
  description,
  inEditMode,
}: FeatureItemBlockProps) {
  return (
    <div
      className="rounded-2xl p-8 h-full"
      style={{ background: "var(--surface-container-lowest)" }}
    >
      {title && (
        <h3
          data-epi-edit={inEditMode ? "title" : undefined}
          className="text-base font-bold mb-3"
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--on-surface)",
          }}
        >
          {title}
        </h3>
      )}
      {description && (
        <p
          data-epi-edit={inEditMode ? "description" : undefined}
          className="text-sm leading-relaxed"
          style={{ color: "var(--on-surface-variant)" }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
