import {
  config,
  contentType,
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
import OptiFormsContainer from "@/components/blocks/OptiFormsContainer";
import OptiFormsTextbox from "@/components/blocks/OptiFormsTextbox";
import OptiFormsTextarea from "@/components/blocks/OptiFormsTextarea";
import OptiFormsSelection from "@/components/blocks/OptiFormsSelection";
import OptiFormsSubmit from "@/components/blocks/OptiFormsSubmit";
import { NavigationItemType, NavigationType, NavigationBlock, NavigationItemPreview } from "@/components/blocks/NavigationItemBlock";
import FaqItemBlock, { FaqItemBlockType, FaqItemFlatTemplate } from "@/components/blocks/FaqItemBlock";
import FaqContainerBlock, { FaqContainerBlockType } from "@/components/blocks/FaqContainerBlock";
import FeaturedContentBlock, { FeaturedContentBlockType, FeaturedContentCardTemplate } from "@/components/blocks/FeaturedContentBlock";
import LogoGridBlock, { LogoGridBlockType, LogoGridColorTemplate } from "@/components/blocks/LogoGridBlock";
import AuthorBlock, { AuthorBlockType, AuthorInlineTemplate } from "@/components/blocks/AuthorBlock";
import OutcomeItemBlock, { OutcomeItemBlockType, OutcomeItemBrandTemplate } from "@/components/blocks/OutcomeItemBlock";
import PricingTierBlock, { PricingTierBlockType, PricingTierCompactTemplate } from "@/components/blocks/PricingTierBlock";
import TimelineMilestoneBlock, { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import TimelineBlock, { TimelineBlockType } from "@/components/blocks/TimelineBlock";
import TeamMemberBlock, { TeamMemberBlockType, TeamMemberHorizontalTemplate } from "@/components/blocks/TeamMemberBlock";
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

// Native Optimizely Forms type schemas — defined here so opti:push does NOT discover
// them (the buildConfig glob only covers src/components/**/*.tsx, not src/lib/).
// These types are already registered in the CMS after forms activation
// (Settings > Forms Settings > Activate); we just tell the SDK their property
// shapes so it includes them in auto-generated composition GraphQL fragments.
const OptiFormsContainerDataType = contentType({
  key: "OptiFormsContainerData",
  displayName: "Form Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    Title:                        { type: "string", displayName: "Title" },
    Description:                  { type: "string", displayName: "Description" },
    SubmitUrl:                    { type: "url",    displayName: "Submit URL" },
    SubmitConfirmationMessage:    { type: "string", displayName: "Submit Confirmation Message" },
    ResetConfirmationMessage:     { type: "string", displayName: "Reset Confirmation Message" },
    ShowSummaryMessageAfterSubmission: { type: "boolean", displayName: "Show Summary" },
  },
});

const OptiFormsTextboxElementType = contentType({
  key: "OptiFormsTextboxElement",
  displayName: "Text Input",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    Label:          { type: "string",  displayName: "Label" },
    Placeholder:    { type: "string",  displayName: "Placeholder" },
    AutoComplete:   { type: "boolean", displayName: "Autocomplete" },
    PredefinedValue:{ type: "string",  displayName: "Predefined Value" },
    Validators:     { type: "string",  displayName: "Validators" },
  },
});

const OptiFormsTextareaElementType = contentType({
  key: "OptiFormsTextareaElement",
  displayName: "Text Area",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    Label:       { type: "string", displayName: "Label" },
    Placeholder: { type: "string", displayName: "Placeholder" },
    Validators:  { type: "string", displayName: "Validators" },
  },
});

const OptiFormsSelectionElementType = contentType({
  key: "OptiFormsSelectionElement",
  displayName: "Selection",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    Label:            { type: "string",  displayName: "Label" },
    Validators:       { type: "string",  displayName: "Validators" },
    AllowMultiSelect: { type: "boolean", displayName: "Allow Multiple" },
    // Options is a JSON scalar containing the array of choice items
    Options:          { type: "string",  displayName: "Options" },
  },
});

const OptiFormsSubmitElementType = contentType({
  key: "OptiFormsSubmitElement",
  displayName: "Submit Button",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    Label:   { type: "string", displayName: "Label" },
    Tooltip: { type: "string", displayName: "Tooltip" },
  },
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
    OptiFormsContainerDataType,
    OptiFormsTextboxElementType,
    OptiFormsTextareaElementType,
    OptiFormsSelectionElementType,
    OptiFormsSubmitElementType,
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
    OutcomeItemBrandTemplate,
    PricingTierCompactTemplate,
    TeamMemberHorizontalTemplate,
    FeaturedContentCardTemplate,
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
      OptiFormsContainerData: OptiFormsContainer,
      OptiFormsTextboxElement: OptiFormsTextbox,
      OptiFormsTextareaElement: OptiFormsTextarea,
      OptiFormsSelectionElement: OptiFormsSelection,
      OptiFormsSubmitElement: OptiFormsSubmit,
      FaqItemBlock: {
        default: FaqItemBlock,
        tags: { Flat: FaqItemBlock },
      },
      FaqContainerBlock,
      FeaturedContentBlock: {
        default: FeaturedContentBlock,
        tags: { Card: FeaturedContentBlock },
      },
      LogoGridBlock: {
        default: LogoGridBlock,
        tags: { Color: LogoGridBlock },
      },
      AuthorBlock: {
        default: AuthorBlock,
        tags: { Inline: AuthorBlock },
      },
      OutcomeItemBlock: {
        default: OutcomeItemBlock,
        tags: { Brand: OutcomeItemBlock },
      },
      PricingTierBlock: {
        default: PricingTierBlock,
        tags: { Compact: PricingTierBlock },
      },
      TimelineMilestoneBlock,
      TimelineBlock,
      TeamMemberBlock: {
        default: TeamMemberBlock,
        tags: { Horizontal: TeamMemberBlock },
      },
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
