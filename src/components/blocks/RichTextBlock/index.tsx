import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface TextBlockData {
  body?: { json: unknown } | null;
  __context?: any;
}

type TextBlockProps = TextBlockData & {
  content?: TextBlockData;
};

export default function TextBlock(props: TextBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  if (!data.body?.json) return null;

  return (
    <div
      {...pa("body")}
      className="max-w-4xl mx-auto px-8 py-16"
      style={{ color: "var(--on-surface-variant)" }}
    >
      <div className="text-base leading-relaxed space-y-6">
        <RichText content={data.body.json as RichTextProps["content"]} />
      </div>
    </div>
  );
}
