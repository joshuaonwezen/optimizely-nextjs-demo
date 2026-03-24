import {
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
  contentType,
} from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";

// Components
import HeroBlock from "@/components/blocks/HeroBlock";
import CallToActionBlock from "@/components/blocks/CallToActionBlock";
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

// Config
import {
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
} from "../../../optimizely.config.mjs";

let initialized = false;

export function initComponentRegistry() {
  if (initialized) return;

  // Content types
  initContentTypeRegistry([
    BlankExperienceContentType,
    BlankSectionContentType,
    LandingPageType,
    contentType({
      key: "DynamicExperience",
      baseType: "_experience",
      displayName: "Dynamic Experience",
    }),
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
    },
  });

  initialized = true;
}
