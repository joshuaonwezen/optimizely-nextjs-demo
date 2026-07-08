import {
  buildConfig,
  contentType,
  contract,
  displayTemplate,
} from "@optimizely/cms-sdk";

// SEO contract — metadata properties shared by every routable page type.
// Consumed by generateMetadata() in src/app/[[...slug]]/page.tsx.
export const SEOContract = contract({
  key: "SEO",
  displayName: "SEO Properties",
  properties: {
    metaTitle:       { type: "string", displayName: "Meta Title",       isLocalized: true },
    metaDescription: { type: "string", displayName: "Meta Description", isLocalized: true },
    // No indexingType here — "disabled" on a _page contentReference would make the SDK
    // skip the field in generated fragments and ogImage would always be null.
    ogImage:         { type: "contentReference", displayName: "Social Share Image", allowedTypes: ["_image"] },
  },
});

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
    "ContactFormBlock",
    "NavigationItem", "Navigation",
    "Footer", "SiteSettings", "SiteBanner",
  ],
  extends: SEOContract,
  properties: {
    lastSync: { type: "dateTime", displayName: "Last Sync" },
  },
});

export const LandingPageType = contentType({
  key: "TraditionalPage",
  displayName: "Traditional Page",
  baseType: "_page",
  mayContainTypes: ["_self"],
  extends: SEOContract,
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
// Pushed to the CMS as a contract, giving Optimizely Graph a shared
// IEditorialContent interface so both types can be queried together.
export const EditorialContentContract = contract({
  key: "EditorialContent",
  displayName: "Editorial Content",
  properties: {
    title:     { type: "string",           displayName: "Title",     indexingType: "searchable", isLocalized: true },
    summary:   { type: "string",           displayName: "Summary",   indexingType: "searchable", isLocalized: true },
    heroImage: { type: "contentReference", displayName: "Hero Image", allowedTypes: ["_image"] },
    tags:      { type: "array",            displayName: "Tags",      indexingType: "queryable",  items: { type: "string" } },
  },
});

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
  extends: [SEOContract, EditorialContentContract],
  properties: {
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

export const CaseStudyPageType = contentType({
  key: "CaseStudyPage",
  displayName: "Case Study",
  baseType: "_page",
  extends: [SEOContract, EditorialContentContract],
  properties: {
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
    maxWidth: {
      editor: "select",
      displayName: "Max Width",
      sortOrder: 2,
      choices: {
        default:   { displayName: "Default (1280px)", sortOrder: 0 },
        narrow:    { displayName: "Narrow (768px)",   sortOrder: 1 },
        fullWidth: { displayName: "Full Width",        sortOrder: 2 },
      },
    },
    reverse: {
      editor: "checkbox",
      displayName: "Reverse column order",
      sortOrder: 3,
      choices: {},
    },
    alignment: {
      editor: "select",
      displayName: "Vertical alignment",
      sortOrder: 4,
      choices: {
        top:    { displayName: "Top",    sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
        bottom: { displayName: "Bottom", sortOrder: 2 },
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
        transparent: { displayName: "None",         sortOrder: 0 },
        surface:     { displayName: "White",        sortOrder: 1 },
        surfaceLow:  { displayName: "Off-white",    sortOrder: 2 },
        blue:        { displayName: "Blue",         sortOrder: 3 },
        blueGrad:    { displayName: "Blue gradient", sortOrder: 4 },
        purple:      { displayName: "Purple",       sortOrder: 5 },
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

export const DefaultSectionTemplate = displayTemplate({
  key: "DefaultSectionTemplate",
  isDefault: true,
  displayName: "Default Section",
  contentType: "BlankSection",
  settings: {
    background: {
      editor: "select",
      displayName: "Background",
      sortOrder: 0,
      choices: {
        transparent: { displayName: "None",          sortOrder: 0 },
        surface:     { displayName: "White",         sortOrder: 1 },
        surfaceLow:  { displayName: "Off-white",     sortOrder: 2 },
        brand:       { displayName: "Blue",          sortOrder: 3 },
        blueGrad:    { displayName: "Blue gradient", sortOrder: 4 },
        purple:      { displayName: "Purple",        sortOrder: 5 },
        dark:        { displayName: "Dark",          sortOrder: 6 },
      },
    },
    paddingY: {
      editor: "select",
      displayName: "Vertical Padding",
      sortOrder: 1,
      choices: {
        none:     { displayName: "None",     sortOrder: 0 },
        compact:  { displayName: "Compact",  sortOrder: 1 },
        default:  { displayName: "Default",  sortOrder: 2 },
        spacious: { displayName: "Spacious", sortOrder: 3 },
      },
    },
    divider: {
      editor: "select",
      displayName: "Divider",
      sortOrder: 2,
      choices: {
        none:   { displayName: "None",   sortOrder: 0 },
        top:    { displayName: "Top",    sortOrder: 1 },
        bottom: { displayName: "Bottom", sortOrder: 2 },
        both:   { displayName: "Both",   sortOrder: 3 },
      },
    },
    cornerRadius: {
      editor: "select",
      displayName: "Corner radius",
      sortOrder: 3,
      choices: {
        none:  { displayName: "None",        sortOrder: 0 },
        lg:    { displayName: "Large",       sortOrder: 1 },
        xl:    { displayName: "Extra large", sortOrder: 2 },
      },
    },
  },
});

export default buildConfig({
  components: ["./optimizely.config.mjs", "./src/components/**/*.tsx"],
});
