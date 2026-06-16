import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FaqItemBlockType = contentType({
  key: "FaqItemBlock",
  displayName: "FAQ Item",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    question: { type: "string", displayName: "Question", indexingType: "searchable", isLocalized: true },
    answer:   { type: "string", displayName: "Answer",   indexingType: "searchable", isLocalized: true },
  },
});

export const FaqItemFlatTemplate = displayTemplate({
  key: "FaqItemFlatTemplate",
  isDefault: false,
  displayName: "Simple divider, no border",
  contentType: "FaqItemBlock",
  tag: "Flat",
  settings: {},
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
  const { pa } = getPreviewUtils(data as any);

  if (!data.question) return null;

  const isFlat = props.displayTemplateKey === "FaqItemFlatTemplate";

  if (isFlat) {
    return (
      <div data-component="FaqItemBlock" className="max-w-3xl mx-auto px-8">
        <details className="group border-b border-outline-variant">
          <summary
            {...pa("question")}
            className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none list-none font-medium text-on-surface hover:text-brand transition-colors"
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
              className="pb-5 text-sm leading-relaxed text-on-surface-variant"
            >
              {data.answer}
            </div>
          )}
        </details>
      </div>
    );
  }

  return (
    <div data-component="FaqItemBlock" className="max-w-3xl mx-auto px-8 mb-2">
      <details className="group border border-ghost-border rounded-xl bg-surface-lowest overflow-hidden">
        <summary
          {...pa("question")}
          className="flex items-center justify-between gap-4 px-6 py-4 cursor-pointer select-none list-none font-medium text-on-surface hover:text-brand transition-colors"
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
            className="px-6 pb-5 text-sm leading-relaxed text-on-surface-variant border-t border-ghost-border pt-4"
          >
            {data.answer}
          </div>
        )}
      </details>
    </div>
  );
}
