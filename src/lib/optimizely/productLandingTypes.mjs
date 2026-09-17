import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { SEOContract } from "../../../optimizely.config.mjs";
import { BACKGROUND_NONE_DEFAULT, HEADING_SIZE, FONT_STYLE, withDefault } from "../../components/blocks/_shared/displayTemplateSettings";

// Content types rolled out per instance. They live outside optimizely.config.mjs and
// src/components/**/*.tsx on purpose: a normal opti:push never carries them anywhere,
// so an instance only gets them from scripts/push-product-landing-types.ts, and the
// app registers them only for hosts in PRODUCT_LANDING_CMS_HOSTS
// (productLandingInstances.ts), leaving every other instance's queries unchanged.
// This is a .mjs file because the SDK typings do not know the "composition"
// property type yet.

// First created by hand in the personal CMS. The properties mirror that
// definition exactly (non-localized, no indexingType).
export const ArticleListBlockType = contentType({
  key: "ArticleListBlock",
  displayName: "Article List",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading" },
    subheading: { type: "string", displayName: "Subheading" },
    category: {
      type: "string",
      format: "selectOne",
      displayName: "Filter by category",
      enum: [
        { value: "personal-finance", displayName: "Personal Finance" },
        { value: "business-banking", displayName: "Business Banking" },
        { value: "investments",      displayName: "Investments" },
        { value: "market-insights",  displayName: "Market Insights" },
      ],
    },
    limit: { type: "integer", displayName: "Maximum items", minimum: 1, maximum: 24 },
    layout: {
      type: "string",
      format: "selectOne",
      displayName: "Layout",
      enum: [
        { value: "grid", displayName: "Grid" },
        { value: "list", displayName: "List" },
      ],
    },
  },
});

export const ArticleListBlockDefaultTemplate = displayTemplate({
  key: "ArticleListBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "ArticleListBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...withDefault(HEADING_SIZE, "lg"),
    ...FONT_STYLE,
  },
});

// Product landing page built from three stacked compositions: a locked top
// (hero banner + a grid section for the sub-hero), an open middle, and a locked
// bottom (article list + FAQs). Top and middle are properties of type
// "composition"; the bottom is the experience's built-in composition, restricted
// via the type-level `composition` config below. SEO fields come from the contract.
// allowedTypes are plain key strings: the CLI only maps objects to keys on
// content/contentReference properties.
// `format` is the composition's layout type. Visual Builder refuses to open a
// composition property without one, and it can only be set while the property
// holds no content anywhere.
export const ProductLandingExperienceType = contentType({
  key: "ProductLandingExperience",
  displayName: "Product Landing",
  baseType: "_experience",
  mayContainTypes: [
    "_self",
    "TraditionalPage", "ArticlePage", "CaseStudyPage", "ConsultantPage",
    "DynamicExperience", "BlogExperience",
  ],
  extends: SEOContract,
  properties: {
    topComposition: {
      type: "composition",
      format: "outline",
      displayName: "Top (hero area)",
      description: "Hero banner and sub-hero grid",
      allowedTypes: ["HeroBlock", "BlankSection"],
      sortOrder: 0,
    },
    middleComposition: {
      type: "composition",
      format: "outline",
      displayName: "Middle (open)",
      description: "Anything goes here",
      sortOrder: 1,
    },
  },
  // The built-in composition is the bottom area. It always sorts last in the
  // Visual Builder outline and its name cannot be changed, so the page reads
  // Top / Middle / Composition. CompositionConfiguration is the only way to
  // restrict it - the name "composition" is reserved as a property.
  composition: {
    allowedTypes: ["ArticleListBlock", "FaqContainerBlock"],
  },
});

export const PRODUCT_LANDING_CONTENT_TYPES = [ArticleListBlockType, ProductLandingExperienceType];
export const PRODUCT_LANDING_DISPLAY_TEMPLATES = [ArticleListBlockDefaultTemplate];
