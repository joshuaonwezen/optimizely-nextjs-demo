import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, BG_CLASSES } from "../_shared/displayTemplateSettings";

export const QuoteBlockType = contentType({
  key: "QuoteBlock",
  displayName: "Quote",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    text:   { type: "string", displayName: "Quote text",   indexingType: "searchable", isLocalized: true },
    author: { type: "string", displayName: "Author name",  indexingType: "searchable", isLocalized: true },
    role:   { type: "string", displayName: "Author role",  indexingType: "searchable", isLocalized: true },
  },
});

export const QuoteBlockDefaultTemplate = displayTemplate({
  key: "QuoteBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "QuoteBlock",
  settings: {
    ...BACKGROUND,
  },
});

interface QuoteData {
  text?:   string | null;
  author?: string | null;
  role?:   string | null;
  __context?: { edit?: boolean } | null;
}

type QuoteBlockProps = QuoteData & {
  content?: QuoteData;
  displaySettings?: Record<string, string | boolean>;
};

export default function QuoteBlock(props: QuoteBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  const bgKey = (ds?.background as string) || "white";
  const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.white;

  return (
    <div
      data-component="QuoteBlock"
      className={`${bg.wrapper} rounded-2xl p-5 flex flex-col gap-3`}
    >
      {data.text && (
        <p {...pa("text")} className={`text-sm ${bg.textMuted} leading-relaxed flex-1`}>
          &ldquo;{data.text}&rdquo;
        </p>
      )}
      <div>
        {data.author && (
          <p {...pa("author")} className={`text-sm font-semibold ${bg.text}`}>
            {data.author}
          </p>
        )}
        {data.role && (
          <p {...pa("role")} className={`text-xs ${bg.textMuted}`}>
            {data.role}
          </p>
        )}
      </div>
    </div>
  );
}
