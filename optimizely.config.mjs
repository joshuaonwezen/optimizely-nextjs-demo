import {
  buildConfig,
  contentType,
  displayTemplate,
} from "@optimizely/cms-sdk";

export const DynamicExperienceType = contentType({
  key: "DynamicExperience",
  displayName: "Dynamic Experience",
  baseType: "_experience",
  // Allow nesting: child DynamicExperience pages (for URL hierarchy like
  // /en/personal/savings/easy-access-savings/) and the new TraditionalPage
  // subtypes (Article, Case Study) that live under /en/insights/articles/.
  mayContainTypes: ["_self", "TraditionalPage", "ArticlePage", "CaseStudyPage"],
  properties: {
    lastSync: { type: "dateTime", displayName: "Last Sync" },
  },
});

export const LandingPageType = contentType({
  key: "TraditionalPage",
  displayName: "Traditional Page",
  baseType: "_page",
  mayContainTypes: ["_self"],
  properties: {
    heading:    { type: "string",   displayName: "Heading" },
    subheading: { type: "string",   displayName: "Subheading" },
    body:       { type: "richText", displayName: "Body" },
    // content: references a single reusable block from the shared content library.
    // The SDK auto-generates inline fragments for every registered component type,
    // so the full block data (all properties) is fetched and rendered directly.
    featuredBlock: { type: "content", displayName: "Featured Block", allowedTypes: ["_component"] },
    includeInNavigation: { type: "boolean", displayName: "Include in Navigation", indexingType: "queryable" },
    navLabel:            { type: "string",  displayName: "Navigation Label" },
    navOrder:            { type: "integer", displayName: "Nav Order",         indexingType: "queryable" },
  },
});

// Editorial article — a TraditionalPage subtype with structured fields for
// authored long-form content. Demonstrates: single content reference (author),
// enum-style category filtering, array-of-strings tag taxonomy, and an array
// of self-references for related-content links.
const CATEGORY_ENUM = [
  { value: "personal-finance",  displayName: "Personal Finance" },
  { value: "business-banking",  displayName: "Business Banking" },
  { value: "investments",       displayName: "Investments" },
  { value: "market-insights",   displayName: "Market Insights" },
];

export const ArticlePageType = contentType({
  key: "ArticlePage",
  displayName: "Article",
  baseType: "_page",
  properties: {
    title:       { type: "string",           displayName: "Title",       indexingType: "searchable" },
    summary:     { type: "string",           displayName: "Summary",     indexingType: "searchable" },
    heroImage:   { type: "contentReference", displayName: "Hero Image",  allowedTypes: ["_image"], indexingType: "disabled" },
    body:        { type: "richText",         displayName: "Body",        indexingType: "searchable" },
    author:      { type: "contentReference", displayName: "Author",      allowedTypes: ["AuthorBlock"] },
    publishDate: { type: "dateTime",         displayName: "Publish Date" },
    category:    { type: "string",           displayName: "Category",    indexingType: "queryable", enum: CATEGORY_ENUM },
    tags:        { type: "array",            displayName: "Tags",        indexingType: "queryable", items: { type: "string" } },
    relatedArticles: {
      type: "array",
      displayName: "Related Articles",
      items: { type: "contentReference", allowedTypes: ["ArticlePage"] },
    },
  },
});

// Case study — a TraditionalPage subtype for customer outcome stories.
// Demonstrates: enum-style industry taxonomy, repeating structured groups via
// OutcomeItemBlock content references, single-block reference for testimonial,
// and self-referencing related case studies.
export const CaseStudyPageType = contentType({
  key: "CaseStudyPage",
  displayName: "Case Study",
  baseType: "_page",
  properties: {
    title:       { type: "string",           displayName: "Title",        indexingType: "searchable" },
    clientName:  { type: "string",           displayName: "Client Name",  indexingType: "queryable" },
    industry:    { type: "string",           displayName: "Industry",     indexingType: "queryable", enum: CATEGORY_ENUM },
    summary:     { type: "string",           displayName: "Summary",      indexingType: "searchable" },
    heroImage:   { type: "contentReference", displayName: "Hero Image",   allowedTypes: ["_image"], indexingType: "disabled" },
    challenge:   { type: "richText",         displayName: "Challenge",    indexingType: "searchable" },
    solution:    { type: "richText",         displayName: "Solution",     indexingType: "searchable" },
    outcomes: {
      type: "array",
      displayName: "Outcomes (Stats)",
      items: { type: "contentReference", allowedTypes: ["OutcomeItemBlock"] },
    },
    testimonial: { type: "contentReference", displayName: "Testimonial", allowedTypes: ["TestimonialBlock"] },
    tags:        { type: "array",            displayName: "Tags", indexingType: "queryable", items: { type: "string" } },
    relatedCaseStudies: {
      type: "array",
      displayName: "Related Case Studies",
      items: { type: "contentReference", allowedTypes: ["CaseStudyPage"] },
    },
  },
});

export const DefaultRowTemplate = displayTemplate({
  key: "DefaultRowTemplate",
  isDefault: true,
  displayName: "Default Row",
  nodeType: "row",
  settings: {
    gap: {
      editor: "select",
      displayName: "Gap",
      sortOrder: 0,
      choices: {
        compact: { displayName: "Compact", sortOrder: 0 },
        default: { displayName: "Default", sortOrder: 1 },
        spacious: { displayName: "Spacious", sortOrder: 2 },
      },
    },
    verticalAlign: {
      editor: "select",
      displayName: "Vertical Alignment",
      sortOrder: 1,
      choices: {
        top: { displayName: "Top", sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
        stretch: { displayName: "Stretch", sortOrder: 2 },
      },
    },
  },
});

export const DefaultColumnTemplate = displayTemplate({
  key: "DefaultColumnTemplate",
  isDefault: true,
  displayName: "Default Column",
  nodeType: "column",
  settings: {
    background: {
      editor: "select",
      displayName: "Background",
      sortOrder: 0,
      choices: {
        transparent: { displayName: "Transparent", sortOrder: 0 },
        surface: { displayName: "Surface", sortOrder: 1 },
        surfaceLow: { displayName: "Surface Low", sortOrder: 2 },
      },
    },
    padding: {
      editor: "select",
      displayName: "Padding",
      sortOrder: 1,
      choices: {
        none: { displayName: "None", sortOrder: 0 },
        compact: { displayName: "Compact", sortOrder: 1 },
        default: { displayName: "Default", sortOrder: 2 },
        spacious: { displayName: "Spacious", sortOrder: 3 },
      },
    },
    rounded: {
      editor: "checkbox",
      displayName: "Rounded Corners",
      sortOrder: 2,
      choices: {},
    },
  },
});

export default buildConfig({
  components: ["./optimizely.config.mjs", "./src/components/**/*.tsx"],
});
