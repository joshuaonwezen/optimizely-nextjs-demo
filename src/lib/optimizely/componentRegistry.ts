import {
  config,
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
} from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";

import HeroBlock, { HeroBlockType, HeroCenteredTemplate } from "@/components/blocks/HeroBlock";
import CallToActionBlock, { CallToActionType, CallToActionOutlineTemplate, CallToActionSurfaceTemplate } from "@/components/blocks/CallToActionBlock";
import TextBlock, { TextBlockType, TextBlockNarrowTemplate } from "@/components/blocks/RichTextBlock";
import ProductCardBlock, { ProductCardBlockType, ProductCardFeaturedTemplate } from "@/components/blocks/ProductCardBlock";
import ProductHeroBlock, { ProductHeroBlockType, ProductHeroCompactTemplate } from "@/components/blocks/ProductHeroBlock";
import FeatureItemBlock, { FeatureItemBlockType, FeatureItemOutlinedTemplate, FeatureItemFlatTemplate } from "@/components/blocks/FeatureItemBlock";
import SectionHeadingBlock, { SectionHeadingBlockType, SectionHeadingCenteredTemplate } from "@/components/blocks/SectionHeadingBlock";
import TestimonialBlock, { TestimonialBlockType, TestimonialCardTemplate, TestimonialMinimalTemplate } from "@/components/blocks/TestimonialBlock";
import StatsCounterBlock, { StatsCounterBlockType, StatsCounterHighlightTemplate } from "@/components/blocks/StatsCounterBlock";
import ImageBlock, { ImageBlockType, ImageBlockRoundedTemplate } from "@/components/blocks/ImageBlock";
import RenditionImageBlock, { RenditionImageBlockType } from "@/components/blocks/RenditionImageBlock";
import FormContainerBlock, { FormContainerBlockType } from "@/components/blocks/FormContainerBlock";
import FormTextInput, { FormTextInputType } from "@/components/blocks/FormTextInput";
import FormTextArea, { FormTextAreaType } from "@/components/blocks/FormTextArea";
import FormSelect, { FormSelectType } from "@/components/blocks/FormSelect";
import FormSubmitButton, { FormSubmitButtonType } from "@/components/blocks/FormSubmitButton";
import { NavigationItemType, NavigationType, NavigationBlock, NavigationItemPreview } from "@/components/blocks/NavigationItemBlock";
import FaqItemBlock, { FaqItemBlockType, FaqItemFlatTemplate } from "@/components/blocks/FaqItemBlock";
import FaqContainerBlock, { FaqContainerBlockType } from "@/components/blocks/FaqContainerBlock";
import FeaturedContentBlock, { FeaturedContentBlockType } from "@/components/blocks/FeaturedContentBlock";
import LogoGridBlock, { LogoGridBlockType, LogoGridColorTemplate } from "@/components/blocks/LogoGridBlock";
import AuthorBlock, { AuthorBlockType, AuthorInlineTemplate } from "@/components/blocks/AuthorBlock";
import OutcomeItemBlock, { OutcomeItemBlockType } from "@/components/blocks/OutcomeItemBlock";
import PricingTierBlock, { PricingTierBlockType } from "@/components/blocks/PricingTierBlock";
import TimelineMilestoneBlock, { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import TimelineBlock, { TimelineBlockType } from "@/components/blocks/TimelineBlock";
import TeamMemberBlock, { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import TeamGridBlock, { TeamGridBlockType } from "@/components/blocks/TeamGridBlock";
import ComparisonTableBlock, { ComparisonTableBlockType } from "@/components/blocks/ComparisonTableBlock";
import CalloutBlock, { CalloutBlockType } from "@/components/blocks/CalloutBlock";

import DynamicExperience from "@/components/experience/DynamicExperience";
import BlankExperience from "@/components/experience/BlankExperience";
import BlankSection from "@/components/experience/BlankSection";
import TraditionalPage from "@/components/pages/TraditionalPage";
import ArticlePage from "@/components/pages/ArticlePage";
import CaseStudyPage from "@/components/pages/CaseStudyPage";

// Experience/page types and structural templates stay in optimizely.config.mjs
import {
  DynamicExperienceType,
  LandingPageType,
  ArticlePageType,
  CaseStudyPageType,
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
    RenditionImageBlockType,
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
    AuthorBlockType,
    OutcomeItemBlockType,
    PricingTierBlockType,
    TimelineMilestoneBlockType,
    TimelineBlockType,
    TeamMemberBlockType,
    TeamGridBlockType,
    ComparisonTableBlockType,
    CalloutBlockType,
    ArticlePageType,
    CaseStudyPageType,
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
    TestimonialMinimalTemplate,
    StatsCounterHighlightTemplate,
    AuthorInlineTemplate,
    FaqItemFlatTemplate,
    LogoGridColorTemplate,
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
      ArticlePage,
      CaseStudyPage,

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
        tags: { Card: TestimonialBlock, Minimal: TestimonialBlock },
      },
      StatsCounterBlock: {
        default: StatsCounterBlock,
        tags: { Highlight: StatsCounterBlock },
      },
      ImageBlock: {
        default: ImageBlock,
        tags: { Rounded: ImageBlock },
      },
      RenditionImageBlock,
      FormContainerBlock,
      FormTextInput,
      FormTextArea,
      FormSelect,
      FormSubmitButton,
      FaqItemBlock: {
        default: FaqItemBlock,
        tags: { Flat: FaqItemBlock },
      },
      FaqContainerBlock,
      FeaturedContentBlock,
      LogoGridBlock: {
        default: LogoGridBlock,
        tags: { Color: LogoGridBlock },
      },
      AuthorBlock: {
        default: AuthorBlock,
        tags: { Inline: AuthorBlock },
      },
      OutcomeItemBlock,
      PricingTierBlock,
      TimelineMilestoneBlock,
      TimelineBlock,
      TeamMemberBlock,
      TeamGridBlock,
      ComparisonTableBlock,
      CalloutBlock,
      Navigation: NavigationBlock,
      NavigationItem: NavigationItemPreview,
      // Fallback: unknown types from the CMS (stale seeds, deleted types) — render nothing
      _Component: () => null,
    },
  });

  initialized = true;
}
