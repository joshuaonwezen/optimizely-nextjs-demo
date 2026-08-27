import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { QuoteBlockType } from "@/components/blocks/QuoteBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import {
  BACKGROUND_OFFWHITE_DEFAULT, TEXT_COLOR, HEADING_SIZE, HEADING_CLASSES, resolveStyleClasses,
} from "../_shared/displayTemplateSettings";

export const CustomerVoicesBlockType = contentType({
  key: "CustomerVoicesBlock",
  displayName: "Customer Voices",
  baseType: "_component",
  // Section-only: the cards content area (type "array") is not allowed on
  // elementEnabled blocks, so this can no longer sit inside a grid column.
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", indexingType: "searchable", isLocalized: true },
    cards: {
      type: "array",
      displayName: "Cards",
      items: { type: "content", allowedTypes: [QuoteBlockType] },
    },
  },
});

export const CustomerVoicesBlockDefaultTemplate = displayTemplate({
  key: "CustomerVoicesBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "CustomerVoicesBlock",
  settings: {
    ...BACKGROUND_OFFWHITE_DEFAULT,
    ...TEXT_COLOR,
    ...HEADING_SIZE,
  },
});

interface CardData {
  __typename?: string;
  text?: string | null;
  author?: string | null;
  role?: string | null;
}

interface CustomerVoicesData {
  heading?: string | null;
  subheading?: string | null;
  cards?: (CardData | unknown)[] | null;
}

type CustomerVoicesProps = CustomerVoicesData & {
  content?: CustomerVoicesData;
  displaySettings?: Record<string, string | boolean>;
};

export default function CustomerVoicesBlock(props: CustomerVoicesProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as never);

  const bg = resolveStyleClasses(ds, { background: "offWhite" });
  const headingKey = (ds?.headingSize as string) || "lg";
  const headingClass = HEADING_CLASSES[headingKey] ?? HEADING_CLASSES.lg;

  const cards = (data.cards ?? []) as CardData[];

  return (
    <section data-component="CustomerVoicesBlock" className={`${bg.wrapper} rounded-2xl px-6 py-10 sm:px-10`}>
      {data.heading && (
        <h2 {...pa("heading")} className={`${headingClass} ${bg.text} font-semibold text-center`}>
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p {...pa("subheading")} className={`mt-2 text-center ${bg.textMuted}`}>
          {data.subheading}
        </p>
      )}
      {cards.length > 0 && (
        <div {...pa("cards")} className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <BlockErrorBoundary key={i}>
              <figure className="bg-surface-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-3">
                <blockquote className="text-sm leading-relaxed flex-1 text-on-surface-variant">
                  &ldquo;{card.text}&rdquo;
                </blockquote>
                <figcaption className="text-sm font-semibold text-on-surface">{card.author}</figcaption>
              </figure>
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}
