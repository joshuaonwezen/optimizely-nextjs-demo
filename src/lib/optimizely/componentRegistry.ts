import {
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

// Experience/page types and structural templates stay in optimizely.config.mjs
import {
  DynamicExperienceType,
  LandingPageType,
  DefaultRowTemplate,
  DefaultColumnTemplate,
} from "../../../optimizely.config.mjs";

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

  // React components
  initReactComponentRegistry({
    resolver: {
      HeroBlock,
      Hero: HeroBlock,
      CallToAction: CallToActionBlock,
      CallToActionBlock: CallToActionBlock,
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
      FaqItemBlock,
      FaqContainerBlock,
      FeaturedContentBlock,
      LogoGridBlock,
    },
  });

  initialized = true;
}
