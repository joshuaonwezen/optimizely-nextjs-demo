import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

interface TextBlockData {
  body?: { json: unknown } | null;
  __context?: any;
}

type TextBlockProps = TextBlockData & {
  content?: TextBlockData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function TextBlock(props: TextBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  if (!data.body?.json) return null;

  const isNarrow = props.displayTemplateKey === "TextBlockNarrowTemplate";

  return (
    <div
      {...pa("body")}
      className={`${isNarrow ? "max-w-2xl" : "max-w-4xl"} mx-auto px-8 py-16 text-on-surface-variant`}
    >
      <div className="text-base leading-relaxed space-y-6">
        <RichText content={data.body.json as RichTextProps["content"]} />
      </div>
    </div>
  );
}
