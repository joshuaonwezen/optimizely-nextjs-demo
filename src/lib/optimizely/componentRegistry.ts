import {
  initContentTypeRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
  contentType,
} from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";
import HeroBlock from "@/components/blocks/HeroBlock";
import CallToActionBlock from "@/components/blocks/CallToActionBlock";
import TextBlock from "@/components/blocks/RichTextBlock";
import ProductCardBlock from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock from "@/components/blocks/SectionHeadingBlock";
import {
  HeroBlockType,
  CallToActionType,
  TextBlockType,
  ProductCardBlockType,
  ProductHeroBlockType,
  FeatureItemBlockType,
  SectionHeadingBlockType,
} from "../../../optimizely.config.mjs";

let initialized = false;

export function initComponentRegistry() {
  if (initialized) return;

  // Register content types so GraphClient.getPreviewContent() can build queries
  initContentTypeRegistry([
    BlankExperienceContentType,
    BlankSectionContentType,
    contentType({
      key: "LandingPage",
      baseType: "_experience",
      displayName: "Landing Page",
    }),
    contentType({
      key: "DynamicExperience",
      baseType: "_experience",
      displayName: "Dynamic Experience",
    }),
    HeroBlockType,
    CallToActionType,
    TextBlockType,
    ProductCardBlockType,
    ProductHeroBlockType,
    FeatureItemBlockType,
    SectionHeadingBlockType,
  ]);

  // Register React components for rendering
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
    },
  });

  initialized = true;
}
