import {
  config,
  contentType,
  initContentTypeRegistry,
  initDisplayTemplateRegistry,
  BlankExperienceContentType,
  BlankSectionContentType,
} from "@optimizely/cms-sdk";
import { initReactComponentRegistry } from "@optimizely/cms-sdk/react/server";
import type { ComponentType } from "react";

import * as HeroBlockModule from "@/components/blocks/HeroBlock";
import * as CallToActionBlockModule from "@/components/blocks/CallToActionBlock";
import * as RichTextBlockModule from "@/components/blocks/RichTextBlock";
import * as ProductCardBlockModule from "@/components/blocks/ProductCardBlock";
import * as ProductHeroBlockModule from "@/components/blocks/ProductHeroBlock";
import * as FeatureItemBlockModule from "@/components/blocks/FeatureItemBlock";
import * as SectionHeadingBlockModule from "@/components/blocks/SectionHeadingBlock";
import * as TestimonialBlockModule from "@/components/blocks/TestimonialBlock";
import * as StatsCounterBlockModule from "@/components/blocks/StatsCounterBlock";
import * as ImageBlockModule from "@/components/blocks/ImageBlock";
import * as RenditionImageBlockModule from "@/components/blocks/RenditionImageBlock";
import * as FaqItemBlockModule from "@/components/blocks/FaqItemBlock";
import * as FaqContainerBlockModule from "@/components/blocks/FaqContainerBlock";
import * as FeaturedContentBlockModule from "@/components/blocks/FeaturedContentBlock";
import * as LogoGridBlockModule from "@/components/blocks/LogoGridBlock";
import * as AuthorBlockModule from "@/components/blocks/AuthorBlock";
import * as OutcomeItemBlockModule from "@/components/blocks/OutcomeItemBlock";
import * as PricingTierBlockModule from "@/components/blocks/PricingTierBlock";
import * as TimelineMilestoneBlockModule from "@/components/blocks/TimelineMilestoneBlock";
import * as TimelineBlockModule from "@/components/blocks/TimelineBlock";
import * as TeamMemberBlockModule from "@/components/blocks/TeamMemberBlock";
import * as TeamGridBlockModule from "@/components/blocks/TeamGridBlock";
import * as ComparisonTableBlockModule from "@/components/blocks/ComparisonTableBlock";
import * as CalloutBlockModule from "@/components/blocks/CalloutBlock";
import * as RawHtmlBlockModule from "@/components/blocks/RawHtmlBlock";
import * as ContactFormBlockModule from "@/components/blocks/ContactFormBlock";
import * as BranchFinderBlockModule from "@/components/blocks/BranchFinderBlock";
import * as QuoteBlockModule from "@/components/blocks/QuoteBlock";
import * as CustomerVoicesBlockModule from "@/components/blocks/CustomerVoicesBlock";
import * as SpotlightBlockModule from "@/components/blocks/SpotlightBlock";
import * as RedirectRuleModule from "@/components/blocks/RedirectRule";
import * as RedirectConfigModule from "@/components/blocks/RedirectConfig";
import OptiFormsContainer from "@/components/blocks/OptiFormsContainer";
import OptiFormsTextbox from "@/components/blocks/OptiFormsTextbox";
import OptiFormsTextarea from "@/components/blocks/OptiFormsTextarea";
import OptiFormsSelection from "@/components/blocks/OptiFormsSelection";
import OptiFormsSubmit from "@/components/blocks/OptiFormsSubmit";
import ArticleListBlock from "@/components/blocks/ArticleListBlock";
import { NavigationItemType, NavigationType, NavigationBlock, NavigationItemPreview } from "@/components/blocks/NavigationItemBlock";
import { FooterType, FooterPreview } from "@/components/layout/Footer";
import { SiteSettingsType, SiteSettingsPreview } from "@/components/layout/SiteSettings";
import { SiteBannerType, SiteBannerBlock } from "@/components/layout/GlobalBanner";

import DynamicExperience from "@/components/experience/DynamicExperience";
import BlogExperience from "@/components/experience/BlogExperience";
import BlankExperience from "@/components/experience/BlankExperience";
import BlankSection from "@/components/experience/BlankSection";
import ProductLandingExperience from "@/components/experience/ProductLandingExperience";
import TraditionalPage from "@/components/pages/TraditionalPage";
import ArticlePage from "@/components/pages/ArticlePage";
import CaseStudyPage from "@/components/pages/CaseStudyPage";
import ConsultantPage from "@/components/pages/ConsultantPage";

// Experience/page types and structural templates stay in optimizely.config.mjs
import {
  DynamicExperienceType,
  BlogExperienceType,
  LandingPageType,
  ArticlePageType,
  CaseStudyPageType,
  ConsultantPageType,
  DefaultRowTemplate,
  DefaultColumnTemplate,
  DefaultSectionTemplate,
} from "../../../optimizely.config.mjs";
import { patchCompositionQueries, registerCompositionProperties } from "./compositionProperties";
import { supportsProductLanding } from "./productLandingInstances";
import {
  ArticleListBlockDefaultTemplate,
  PRODUCT_LANDING_CONTENT_TYPES,
  ProductLandingExperienceType,
} from "./productLandingTypes.mjs";

type ContentTypeDef = Parameters<typeof initContentTypeRegistry>[0][number];
type DisplayTemplateDef = Parameters<typeof initDisplayTemplateRegistry>[0][number];

// Configure the Graph client once for the whole app — all getClient() calls use this.
config({
  apiKey: process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "",
  graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
});

// Rolled out per instance (productLandingTypes.mjs). Registering them against an
// instance whose Graph lacks the types would break every page there.
const PRODUCT_LANDING = supportsProductLanding();

// Deeper composition nesting (native forms) and extra `composition`-type properties
// both need query text the SDK does not generate. See compositionProperties.ts.
patchCompositionQueries();
if (PRODUCT_LANDING) registerCompositionProperties([ProductLandingExperienceType]);

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

// Standard blocks. Each module under src/components/blocks exports exactly one
// contentType(), its displayTemplate()s and the React component as default, so
// registering a new block is one import plus one entry here (the SDK tags those
// exports with __type, which is how they are picked out below).
const BLOCK_MODULES = [
  HeroBlockModule,
  CallToActionBlockModule,
  RichTextBlockModule,
  ProductCardBlockModule,
  ProductHeroBlockModule,
  FeatureItemBlockModule,
  SectionHeadingBlockModule,
  TestimonialBlockModule,
  StatsCounterBlockModule,
  ImageBlockModule,
  RenditionImageBlockModule,
  FaqItemBlockModule,
  FaqContainerBlockModule,
  FeaturedContentBlockModule,
  LogoGridBlockModule,
  AuthorBlockModule,
  OutcomeItemBlockModule,
  PricingTierBlockModule,
  TimelineMilestoneBlockModule,
  TimelineBlockModule,
  TeamMemberBlockModule,
  TeamGridBlockModule,
  ComparisonTableBlockModule,
  CalloutBlockModule,
  RawHtmlBlockModule,
  ContactFormBlockModule,
  BranchFinderBlockModule,
  QuoteBlockModule,
  CustomerVoicesBlockModule,
  SpotlightBlockModule,
  RedirectRuleModule,
  RedirectConfigModule,
] as const;

type BlockModule = (typeof BLOCK_MODULES)[number];

function exportsOfKind<T>(mod: BlockModule, kind: "contentType" | "displayTemplate"): T[] {
  return Object.values(mod).filter(
    (value): value is T =>
      typeof value === "object" && value !== null && (value as { __type?: string }).__type === kind
  );
}

function blockContentType(mod: BlockModule): ContentTypeDef {
  const [type, ...extra] = exportsOfKind<ContentTypeDef>(mod, "contentType");
  if (!type || extra.length > 0) {
    throw new Error(`Block module must export exactly one contentType(); got ${extra.length + (type ? 1 : 0)}`);
  }
  return type;
}

let initialized = false;

export function initComponentRegistry() {
  if (initialized) return;

  // Content types
  initContentTypeRegistry([
    BlankExperienceContentType,
    BlankSectionContentType,
    DynamicExperienceType,
    BlogExperienceType,
    LandingPageType,
    ArticlePageType,
    CaseStudyPageType,
    ConsultantPageType,
    ...BLOCK_MODULES.map(blockContentType),
    OptiFormsContainerDataType,
    OptiFormsTextboxElementType,
    OptiFormsTextareaElementType,
    OptiFormsSelectionElementType,
    OptiFormsSubmitElementType,
    NavigationItemType,
    NavigationType,
    FooterType,
    SiteSettingsType,
    SiteBannerType,
    ...(PRODUCT_LANDING ? PRODUCT_LANDING_CONTENT_TYPES : []),
  ]);

  // Display templates
  initDisplayTemplateRegistry([
    ...BLOCK_MODULES.flatMap((mod) => exportsOfKind<DisplayTemplateDef>(mod, "displayTemplate")),
    DefaultRowTemplate,
    DefaultColumnTemplate,
    DefaultSectionTemplate,
    ...(PRODUCT_LANDING ? [ArticleListBlockDefaultTemplate] : []),
  ]);

  // React components, keyed by content type key. Display template variants need no
  // entries of their own: every block renders all of its templates itself (branching
  // on displayTemplateKey), so the resolver ignores the template tag.
  //
  // Registered via a resolver function (not a plain map): SDK 2.1.0's
  // OptimizelyGridSection calls getComponent(undefined) for node types other
  // than row/column, and the object-map path crashes on undefined
  // (getEntryWithFallback calls contentType.endsWith). The function path
  // lets us guard and restore 2.0.0's silent-fallback behavior.
  // Re-verified against cms-sdk 2.2.0: getComponent now short-circuits to the
  // function resolver before reaching getEntryWithFallback (and that method also
  // guards `typeof resolver === 'function'`), so the crash path is bypassed and the
  // `if (!name)` guard below still absorbs the getComponent(undefined) call - keep.
  // Values are loosely typed: each component declares its own props, which the
  // SDK passes at render time.
  const componentMap: Record<string, unknown> = {
    // Experience / page types
    DynamicExperience,
    BlogExperience,
    ProductLandingExperience,
    BlankExperience,
    BlankSection,
    TraditionalPage,
    LandingPage: TraditionalPage,
    ArticlePage,
    CaseStudyPage,
    ConsultantPage,

    ...Object.fromEntries(
      BLOCK_MODULES.map((mod) => [blockContentType(mod).key, mod.default])
    ),
    // Legacy key still referenced by older CMS entries.
    Hero: HeroBlockModule.default,
    ArticleListBlock,

    // Native Optimizely Forms
    OptiFormsContainerData: OptiFormsContainer,
    OptiFormsTextboxElement: OptiFormsTextbox,
    OptiFormsTextareaElement: OptiFormsTextarea,
    OptiFormsSelectionElement: OptiFormsSelection,
    OptiFormsSubmitElement: OptiFormsSubmit,

    // Shared blocks previewed on their own in the CMS
    Navigation: NavigationBlock,
    NavigationItem: NavigationItemPreview,
    Footer: FooterPreview,
    SiteSettings: SiteSettingsPreview,
    SiteBanner: SiteBannerBlock,

    // The resolver's last resort for a composition node Graph returns only as the
    // base _Component type (e.g. a type this app doesn't register): render nothing.
    _Component: () => null,
  };

  initReactComponentRegistry({
    resolver: (name) => {
      if (!name) return undefined;
      // Mirror the SDK's map semantics, including the "Property"-suffix fallback
      const entry = componentMap[name] ?? (name.endsWith("Property") ? componentMap[name.slice(0, -8)] : undefined);
      return entry as ComponentType | undefined;
    },
  });

  initialized = true;
}
