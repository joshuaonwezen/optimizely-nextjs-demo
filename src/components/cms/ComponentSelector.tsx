import type { ContentAreaItemWithSettings } from "@/types/cms";
import HeroBlock from "@/components/blocks/HeroBlock";
import CallToAction from "@/components/blocks/CallToActionBlock";
import TextBlock from "@/components/blocks/RichTextBlock";
import ProductCardBlock from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock from "@/components/blocks/SectionHeadingBlock";
import TestimonialBlock from "@/components/blocks/TestimonialBlock";
import StatsCounterBlock from "@/components/blocks/StatsCounterBlock";
import ImageBlock from "@/components/blocks/ImageBlock";
import FormContainerBlock from "@/components/blocks/FormContainerBlock";
import FormTextInput from "@/components/blocks/FormTextInput";
import FormTextArea from "@/components/blocks/FormTextArea";
import FormSelect from "@/components/blocks/FormSelect";
import FormSubmitButton from "@/components/blocks/FormSubmitButton";

/**
 * Component registry — maps Optimizely Graph __typename to React components.
 */
const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  HeroBlock,
  Hero: HeroBlock,
  CallToAction,
  TextBlock,
  ProductCardBlock,
  ProductHeroBlock,
  FeatureItemBlock,
  SectionHeadingBlock,
  TestimonialBlock,
  StatsCounterBlock,
  ImageBlock,
  FormContainerBlock,
  FormTextInput,
  FormTextArea,
  FormSelect,
  FormSubmitButton,
};

export interface CompositionRow {
  key: string;
  items: ContentAreaItemWithSettings[];
  displaySettings?: Record<string, string | boolean>;
}

interface ComponentSelectorProps {
  rows: CompositionRow[];
  inEditMode?: boolean;
}

/**
 * Factory component that dispatches Optimizely content items to React components.
 *
 * Each item carries its own displaySettings from the composition node,
 * which get passed through to the component for style customization.
 */
export function ComponentSelector({
  rows,
  inEditMode = false,
}: ComponentSelectorProps) {
  return (
    <>
      {rows.map((row) => {
        const rendered = row.items
          .map(({ item, displaySettings, displayTemplateKey }, index) => {
            const Component = COMPONENT_REGISTRY[item.__typename];

            if (!Component) {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  `[ComponentSelector] No component for: "${item.__typename}"`
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
                <Component
                  {...item}
                  displaySettings={displaySettings}
                  displayTemplateKey={displayTemplateKey}
                  inEditMode={inEditMode}
                />
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
