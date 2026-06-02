import {
  config,
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
} from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";

// Components + their colocated content type definitions
import HeroBlock, { HeroBlockType, HeroCenteredTemplate } from "@/components/blocks/HeroBlock";
import CallToActionBlock, { CallToActionType, CallToActionOutlineTemplate, CallToActionSurfaceTemplate } from "@/components/blocks/CallToActionBlock";
import TextBlock, { TextBlockType, TextBlockNarrowTemplate } from "@/components/blocks/RichTextBlock";
import ProductCardBlock, { ProductCardBlockType, ProductCardFeaturedTemplate } from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock, { ProductHeroBlockType, ProductHeroCompactTemplate } from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock, { FeatureItemBlockType, FeatureItemOutlinedTemplate, FeatureItemFlatTemplate } from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock, { SectionHeadingBlockType, SectionHeadingCenteredTemplate } from "@/components/blocks/SectionHeadingBlock";
import TestimonialBlock, { TestimonialBlockType, TestimonialCardTemplate } from "@/components/blocks/TestimonialBlock";
import StatsCounterBlock, { StatsCounterBlockType } from "@/components/blocks/StatsCounterBlock";
import ImageBlock, { ImageBlockType, ImageBlockRoundedTemplate } from "@/components/blocks/ImageBlock";
import FormContainerBlock, { FormContainerBlockType } from "@/components/blocks/FormContainerBlock";
import FormTextInput, { FormTextInputType } from "@/components/blocks/FormTextInput";
import FormTextArea, { FormTextAreaType } from "@/components/blocks/FormTextArea";
import FormSelect, { FormSelectType } from "@/components/blocks/FormSelect";
import FormSubmitButton, { FormSubmitButtonType } from "@/components/blocks/FormSubmitButton";
import { NavigationItemType, NavigationType } from "@/components/blocks/NavigationItemBlock";
import FaqItemBlock, { FaqItemBlockType } from "@/components/blocks/FaqItemBlock";
import FaqContainerBlock, { FaqContainerBlockType } from "@/components/blocks/FaqContainerBlock";
import FeaturedContentBlock, { FeaturedContentBlockType } from "@/components/blocks/FeaturedContentBlock";
import LogoGridBlock, { LogoGridBlockType } from "@/components/blocks/LogoGridBlock";

// Experience and section components
import DynamicExperience from "@/components/experience/DynamicExperience";
import BlankExperience from "@/components/experience/BlankExperience";
import BlankSection from "@/components/experience/BlankSection";
import TraditionalPage from "@/components/pages/TraditionalPage";

// Experience/page types and structural templates stay in optimizely.config.mjs
import {
  DynamicExperienceType,
  LandingPageType,
  DefaultRowTemplate,
  DefaultColumnTemplate,
} from "../../../optimizely.config.mjs";

// Configure the Graph client once for the whole app — all getClient() calls use this.
config({
  apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "",
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});

let initialized = false;

export function initComponentRegistry() {
  if (initialized) return;

  // Content types
  initContentTypeRegistry([
    BlankExperienceContentType,
    BlankSectionContentType,
    DynamicExperienceType,
    LandingPageType,
    HeroBlockType,
    ProductHeroBlockType,
    SectionHeadingBlockType,
    TextBlockType,
    CallToActionType,
    ProductCardBlockType,
    FeatureItemBlockType,
    TestimonialBlockType,
    StatsCounterBlockType,
    ImageBlockType,
    FormContainerBlockType,
    FormTextInputType,
    FormTextAreaType,
    FormSelectType,
    FormSubmitButtonType,
    NavigationItemType,
    NavigationType,
    FaqItemBlockType,
    FaqContainerBlockType,
    FeaturedContentBlockType,
    LogoGridBlockType,
  ]);

  // Display templates
  initDisplayTemplateRegistry([
    HeroCenteredTemplate,
    ProductHeroCompactTemplate,
    SectionHeadingCenteredTemplate,
    TextBlockNarrowTemplate,
    CallToActionOutlineTemplate,
    CallToActionSurfaceTemplate,
    ProductCardFeaturedTemplate,
    FeatureItemOutlinedTemplate,
    FeatureItemFlatTemplate,
    TestimonialCardTemplate,
    ImageBlockRoundedTemplate,
    DefaultRowTemplate,
    DefaultColumnTemplate,
  ]);

  // React components — display template variants use the tags pattern so the SDK
  // dispatches to the right component based on the editor-selected template.
  initReactComponentRegistry({
    resolver: {
      // Experience / page types
      DynamicExperience,
      BlankExperience,
      BlankSection,
      TraditionalPage,
      LandingPage: TraditionalPage,

      // Blocks — variants registered via tags so the SDK routes by displayTemplateKey
      HeroBlock: {
        default: HeroBlock,
        tags: { Centered: HeroBlock },
      },
      Hero: HeroBlock,
      CallToAction: {
        default: CallToActionBlock,
        tags: {
          Outline: CallToActionBlock,
          Surface: CallToActionBlock,
        },
      },
      CallToActionBlock: CallToActionBlock,
      TextBlock: {
        default: TextBlock,
        tags: { Narrow: TextBlock },
      },
      ProductCardBlock: {
        default: ProductCardBlock,
        tags: { Featured: ProductCardBlock },
      },
      ProductHeroBlock: {
        default: ProductHeroBlock,
        tags: { Compact: ProductHeroBlock },
      },
      FeatureItemBlock: {
        default: FeatureItemBlock,
        tags: {
          Outlined: FeatureItemBlock,
          Flat: FeatureItemBlock,
        },
      },
      SectionHeadingBlock: {
        default: SectionHeadingBlock,
        tags: { Centered: SectionHeadingBlock },
      },
      TestimonialBlock: {
        default: TestimonialBlock,
        tags: { Card: TestimonialBlock },
      },
      StatsCounterBlock,
      ImageBlock: {
        default: ImageBlock,
        tags: { Rounded: ImageBlock },
      },
      FormContainerBlock,
      FormTextInput,
      FormTextArea,
      FormSelect,
      FormSubmitButton,
      FaqItemBlock,
      FaqContainerBlock,
      FeaturedContentBlock,
      LogoGridBlock,
      // Fallback: unknown types from the CMS (stale seeds, deleted types) — render nothing
      _Component: () => null,
    },
  });

  initialized = true;
}
