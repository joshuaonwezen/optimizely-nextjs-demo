import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_COLOR, HEADING_SIZE, FONT_STYLE, FONT_CLASSES, HEADING_CLASSES, resolveStyleClasses,
} from "../_shared/displayTemplateSettings";

export const FaqItemBlockType = contentType({
  key: "FaqItemBlock",
  displayName: "FAQ Item",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    question: { type: "string", displayName: "Question", indexingType: "searchable", isLocalized: true },
    answer:   { type: "string", displayName: "Answer",   indexingType: "searchable", isLocalized: true },
  },
});

export const FaqItemBlockDefaultTemplate = displayTemplate({
  key: "FaqItemBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "FaqItemBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

export const FaqItemFlatTemplate = displayTemplate({
  key: "FaqItemFlatTemplate",
  isDefault: false,
  displayName: "Minimal (divider only)",
  contentType: "FaqItemBlock",
  tag: "Flat",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...HEADING_SIZE,
    ...FONT_STYLE,
  },
});

interface FaqItemData {
  question?: string | null;
  answer?:   string | null;
  __context?: { edit?: boolean } | null;
}

type FaqItemBlockProps = FaqItemData & {
  content?: FaqItemData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function FaqItemBlock(props: FaqItemBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  if (!data.question) return null;

  const isFlat = props.displayTemplateKey === "FaqItemFlatTemplate";
  const headingClass = HEADING_CLASSES[(ds?.headingSize as string) ?? "sm"];
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
  const style = resolveStyleClasses(ds, { background: isFlat ? "transparent" : "white" });

  if (isFlat) {
    return (
      <div data-component="FaqItemBlock" data-track-toggle="mb_faq_expand" className="max-w-3xl mx-auto px-8">
        <details className="group border-b border-outline-variant">
          <summary
            {...pa("question")}
            className={`flex items-center justify-between gap-4 py-4 cursor-pointer select-none list-none ${fontClass} ${headingClass} font-medium ${style.text} hover:text-brand transition-colors`}
          >
            {data.question}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="shrink-0 transition-transform duration-200 group-open:rotate-180 text-on-surface-variant"
            >
              <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          {data.answer && (
            <div
              {...pa("answer")}
              className={`pb-5 text-sm leading-relaxed ${style.textMuted}`}
            >
              {data.answer}
            </div>
          )}
        </details>
      </div>
    );
  }

  return (
    <div data-component="FaqItemBlock" data-track-toggle="mb_faq_expand" className="max-w-3xl mx-auto px-8 mb-2">
      <details className={`group rounded-xl overflow-hidden ${style.wrapper || "border border-ghost-border bg-surface-lowest"}`}>
        <summary
          {...pa("question")}
          className={`flex items-center justify-between gap-4 px-6 py-4 cursor-pointer select-none list-none ${fontClass} font-medium ${style.text} hover:text-brand transition-colors`}
        >
          {data.question}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 transition-transform duration-200 group-open:rotate-180 text-on-surface-variant"
          >
            <path d="M3 6L8 11L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        {data.answer && (
          <div
            {...pa("answer")}
            className={`px-6 pb-5 text-sm leading-relaxed ${style.textMuted} border-t border-ghost-border pt-4`}
          >
            {data.answer}
          </div>
        )}
      </details>
    </div>
  );
}
