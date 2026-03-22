interface CallToActionProps {
  label?: string | null;
  link?: string | null;
  inEditMode?: boolean;
}

export default function CallToActionBlock({
  label,
  link,
  inEditMode,
}: CallToActionProps) {
  return (
    <section
      className="py-24"
      style={{ background: "var(--surface-container-low)" }}
    >
      <div className="max-w-7xl mx-auto px-8 text-center">
        {link && (
          <a
            href={link}
            data-epi-edit={inEditMode ? "label" : undefined}
            className="hover-lift inline-block px-10 py-4 rounded-lg font-semibold text-base text-on-brand"
            style={{
              fontFamily: "var(--font-display)",
              background: "var(--gradient-brand)",
            }}
          >
            {label ?? "Get Started"}
          </a>
        )}
      </div>
    </section>
  );
}
