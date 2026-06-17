import {
  buildConfig,
  contentType,
  displayTemplate,
} from "@optimizely/cms-sdk";

export const DynamicExperienceType = contentType({
  key: "DynamicExperience",
  displayName: "Dynamic Experience",
  baseType: "_experience",
  mayContainTypes: [
    "_self",
    "TraditionalPage", "ArticlePage", "CaseStudyPage",
    "AuthorBlock", "OutcomeItemBlock", "TestimonialBlock",
    "FaqItemBlock", "FaqContainerBlock",
    "TimelineMilestoneBlock", "TeamMemberBlock",
    "NavigationItem", "Navigation",
  ],
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
    heading:    { type: "string",   displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string",   displayName: "Subheading", indexingType: "searchable", isLocalized: true },
    heroImage:  { type: "contentReference", displayName: "Hero Image", allowedTypes: ["_image"] },
    body:       { type: "richText", displayName: "Body", indexingType: "searchable", isLocalized: true },
    // content: references a single reusable block from the shared content library.
    // The SDK auto-generates inline fragments for every registered component type,
    // so the full block data (all properties) is fetched and rendered directly.
    featuredBlock: { type: "content", displayName: "Featured Block", allowedTypes: ["_component"] },
    includeInNavigation: { type: "boolean", displayName: "Include in Navigation", indexingType: "queryable" },
    navLabel:            { type: "string",  displayName: "Navigation Label", indexingType: "queryable", isLocalized: true },
    navOrder:            { type: "integer", displayName: "Nav Order",         indexingType: "queryable" },
  },
});

// EditorialContent contract — properties shared by ArticlePage and CaseStudyPage.
//
// When @optimizely/cms-sdk exports contract(), this becomes:
//   export const EditorialContentContract = contract({ key: "EditorialContent", ... })
// and each content type uses:  extends: EditorialContentContract
//
// For now, spread EDITORIAL_CONTENT_PROPERTIES into each type's properties block.
// Defining the matching contract in the CMS (UI or REST API) gives Optimizely Graph
// a shared IEditorialContent interface so both types can be queried together.
const EDITORIAL_CONTENT_PROPERTIES = {
  title:     { type: "string",           displayName: "Title",     indexingType: "searchable", isLocalized: true },
  summary:   { type: "string",           displayName: "Summary",   indexingType: "searchable", isLocalized: true },
  heroImage: { type: "contentReference", displayName: "Hero Image", allowedTypes: ["_image"] },
  tags:      { type: "array",            displayName: "Tags",      indexingType: "queryable",  items: { type: "string" } },
};

export const EditorialContentContract = {
  key: "EditorialContent",
  displayName: "Editorial Content",
  description: "Shared properties for editorial page types. Create this contract in the CMS to unlock the IEditorialContent Graph interface.",
  properties: EDITORIAL_CONTENT_PROPERTIES,
};

const CATEGORY_ENUM = [
  { value: "personal-finance",  displayName: "Personal Finance" },
  { value: "business-banking",  displayName: "Business Banking" },
  { value: "investments",       displayName: "Investments" },
  { value: "market-insights",   displayName: "Market Insights" },
];

// Editorial article. Implements EditorialContentContract via property spread.
export const ArticlePageType = contentType({
  key: "ArticlePage",
  displayName: "Article",
  baseType: "_page",
  properties: {
    ...EDITORIAL_CONTENT_PROPERTIES,
    body:        { type: "richText",         displayName: "Body",         indexingType: "searchable", isLocalized: true },
    author:      { type: "contentReference", displayName: "Author",       allowedTypes: ["AuthorBlock"] },
    publishDate: { type: "dateTime",         displayName: "Publish Date", indexingType: "queryable" },
    category:    { type: "string",           displayName: "Category",     indexingType: "queryable", enum: CATEGORY_ENUM },
    relatedArticles: {
      type: "array",
      displayName: "Related Articles",
      items: { type: "contentReference", allowedTypes: ["ArticlePage"] },
    },
  },
});

// Case study. Implements EditorialContentContract via property spread.
export const CaseStudyPageType = contentType({
  key: "CaseStudyPage",
  displayName: "Case Study",
  baseType: "_page",
  properties: {
    ...EDITORIAL_CONTENT_PROPERTIES,
    clientName:  { type: "string",           displayName: "Client Name",  indexingType: "queryable",  isLocalized: true },
    industry:    { type: "string",           displayName: "Industry",     indexingType: "queryable",  enum: CATEGORY_ENUM },
    challenge:   { type: "richText",         displayName: "Challenge",    indexingType: "searchable", isLocalized: true },
    solution:    { type: "richText",         displayName: "Solution",     indexingType: "searchable", isLocalized: true },
    outcomes: {
      type: "array",
      displayName: "Outcomes (Stats)",
      items: { type: "contentReference", allowedTypes: ["OutcomeItemBlock"] },
    },
    testimonial:       { type: "contentReference", displayName: "Testimonial", allowedTypes: ["TestimonialBlock"] },
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
