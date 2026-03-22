import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";

interface TextBlockProps {
  body?: { json: unknown } | null;
  inEditMode?: boolean;
}

export default function TextBlock({
  body,
  inEditMode,
}: TextBlockProps) {
  if (!body?.json) return null;

  return (
    <div
      data-epi-edit={inEditMode ? "body" : undefined}
      className="max-w-4xl mx-auto px-8 py-16"
      style={{ color: "var(--on-surface-variant)" }}
    >
      <div className="text-base leading-relaxed space-y-6">
        <RichText content={body.json as RichTextProps["content"]} />
      </div>
    </div>
  );
}
