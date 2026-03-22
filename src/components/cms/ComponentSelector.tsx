import type { ContentAreaItem } from "@/types/cms";
import HeroBlock from "@/components/blocks/HeroBlock";
import CallToAction from "@/components/blocks/CallToActionBlock";
import TextBlock from "@/components/blocks/RichTextBlock";
import ProductCardBlock from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock from "@/components/blocks/SectionHeadingBlock";

/**
 * Component registry — maps Optimizely Graph __typename to React components.
 *
 * Keys MUST exactly match the __typename values returned by Optimizely Graph,
 * which are the PascalCase content type names defined in the CMS instance.
 * When you create a new block type, add it here and create its component + fragment.
 */
const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  HeroBlock,
  Hero: HeroBlock, // Hero type uses the same component with heading/summary fields
  CallToAction,
  TextBlock,
  ProductCardBlock,
  ProductHeroBlock,
  FeatureItemBlock,
  SectionHeadingBlock,
};

export interface CompositionRow {
  key: string;
  items: ContentAreaItem[];
}

interface ComponentSelectorProps {
  /** Composition rows from GraphQL response */
  rows: CompositionRow[];
  /** Whether Visual Builder edit mode is active */
  inEditMode?: boolean;
}

/**
 * Factory component that dispatches Optimizely content items to React components.
 *
 * For each item, it reads __typename, looks up the registered component, and renders it.
 * The data-epi-block-id attribute on the wrapper div is required by Visual Builder
 * to identify which block is being clicked for on-page editing.
 *
 * Rows with multiple items are rendered in a CSS grid layout.
 */
export function ComponentSelector({
  rows,
  inEditMode = false,
}: ComponentSelectorProps) {
  return (
    <>
      {rows.map((row) => {
        const rendered = row.items
          .map((item, index) => {
            const Component = COMPONENT_REGISTRY[item.__typename];

            if (!Component) {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  `[ComponentSelector] No component registered for __typename: "${item.__typename}". ` +
                    `Add it to COMPONENT_REGISTRY in ComponentSelector.tsx`
                );
              }
              return null;
            }

            const key = item._metadata?.key ?? `block-${index}`;

            return (
              <div
                key={key}
                data-epi-block-id={inEditMode ? key : undefined}
              >
                <Component {...item} inEditMode={inEditMode} />
              </div>
            );
          })
          .filter(Boolean);

        if (rendered.length === 0) return null;

        if (rendered.length === 1) {
          return <div key={row.key}>{rendered}</div>;
        }

        const gridCols =
          rendered.length === 2
            ? "md:grid-cols-2"
            : rendered.length === 3
              ? "md:grid-cols-3"
              : "md:grid-cols-4";

        return (
          <div
            key={row.key}
            className={`grid grid-cols-1 ${gridCols} gap-8 px-8 max-w-7xl mx-auto`}
          >
            {rendered}
          </div>
        );
      })}
    </>
  );
}
