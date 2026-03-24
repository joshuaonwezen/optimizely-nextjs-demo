import {
  buildConfig,
  contentType,
  displayTemplate,
} from "@optimizely/cms-sdk";

// =============================================================================
// Experience Type
// =============================================================================

export const LandingPageType = contentType({
  key: "LandingPage",
  displayName: "Landing Page",
  baseType: "_experience",
});

// =============================================================================
// Content Types & Display Templates
// =============================================================================

// --- HeroBlock ---------------------------------------------------------------

export const HeroBlockType = contentType({
  key: "HeroBlock",
  displayName: "Hero Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    headline: { type: "string", displayName: "Headline", indexingType: "searchable" },
    subheadline: { type: "string", displayName: "Subheadline", indexingType: "searchable" },
    backgroundImage: { type: "contentReference", displayName: "Background Image", allowedTypes: ["_image"] },
    ctaText: { type: "string", displayName: "CTA Text" },
    ctaLink: { type: "url", displayName: "CTA Link" },
  },
});

export const HeroCenteredTemplate = displayTemplate({
  key: "HeroCenteredTemplate",
  isDefault: false,
  displayName: "Centered Hero",
  contentType: "HeroBlock",
  tag: "Centered",
  settings: {
    height: {
      editor: "select",
      displayName: "Height",
      sortOrder: 0,
      choices: {
        default: { displayName: "Default", sortOrder: 0 },
        tall: { displayName: "Full Viewport", sortOrder: 1 },
      },
    },
    overlay: {
      editor: "checkbox",
      displayName: "Dark Overlay on Image",
      sortOrder: 1,
      choices: {},
    },
  },
});

// --- ProductHeroBlock --------------------------------------------------------

export const ProductHeroBlockType = contentType({
  key: "ProductHeroBlock",
  displayName: "Product Hero",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    badge: { type: "string", displayName: "Badge Text" },
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description", indexingType: "searchable" },
    ctaText: { type: "string", displayName: "CTA Text" },
    ctaUrl: { type: "url", displayName: "CTA URL" },
  },
});

export const ProductHeroCompactTemplate = displayTemplate({
  key: "ProductHeroCompactTemplate",
  isDefault: false,
  displayName: "Compact Product Hero",
  contentType: "ProductHeroBlock",
  tag: "Compact",
  settings: {
    alignment: {
      editor: "select",
      displayName: "Text Alignment",
      sortOrder: 0,
      choices: {
        left: { displayName: "Left", sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
      },
    },
  },
});

// --- SectionHeadingBlock -----------------------------------------------------

export const SectionHeadingBlockType = contentType({
  key: "SectionHeadingBlock",
  displayName: "Section Heading",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable" },
    subheading: { type: "string", displayName: "Subheading" },
  },
});

export const SectionHeadingCenteredTemplate = displayTemplate({
  key: "SectionHeadingCenteredTemplate",
  isDefault: false,
  displayName: "Centered Section Heading",
  contentType: "SectionHeadingBlock",
  tag: "Centered",
  settings: {
    showAccent: {
      editor: "checkbox",
      displayName: "Show Accent Line",
      sortOrder: 0,
      choices: {},
    },
  },
});

// --- TextBlock ---------------------------------------------------------------

export const TextBlockType = contentType({
  key: "TextBlock",
  displayName: "Text Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    body: { type: "richText", displayName: "Body" },
  },
});

export const TextBlockNarrowTemplate = displayTemplate({
  key: "TextBlockNarrowTemplate",
  isDefault: false,
  displayName: "Narrow Text Block",
  contentType: "TextBlock",
  tag: "Narrow",
  settings: {},
});

// --- CallToAction ------------------------------------------------------------

export const CallToActionType = contentType({
  key: "CallToAction",
  displayName: "Call to Action",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label" },
    link: { type: "url", displayName: "Link" },
  },
});

export const CallToActionOutlineTemplate = displayTemplate({
  key: "CallToActionOutlineTemplate",
  isDefault: false,
  displayName: "Outline CTA",
  contentType: "CallToAction",
  tag: "Outline",
  settings: {
    size: {
      editor: "select",
      displayName: "Size",
      sortOrder: 0,
      choices: {
        default: { displayName: "Default", sortOrder: 0 },
        large: { displayName: "Large", sortOrder: 1 },
      },
    },
  },
});

export const CallToActionSurfaceTemplate = displayTemplate({
  key: "CallToActionSurfaceTemplate",
  isDefault: false,
  displayName: "Surface CTA",
  contentType: "CallToAction",
  tag: "Surface",
  settings: {
    size: {
      editor: "select",
      displayName: "Size",
      sortOrder: 0,
      choices: {
        default: { displayName: "Default", sortOrder: 0 },
        large: { displayName: "Large", sortOrder: 1 },
      },
    },
  },
});

// --- ProductCardBlock --------------------------------------------------------

export const ProductCardBlockType = contentType({
  key: "ProductCardBlock",
  displayName: "Product Card",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    icon: { type: "string", displayName: "Icon Name" },
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description", indexingType: "searchable" },
    linkUrl: { type: "url", displayName: "Link URL" },
    linkText: { type: "string", displayName: "Link Text" },
  },
});

export const ProductCardFeaturedTemplate = displayTemplate({
  key: "ProductCardFeaturedTemplate",
  isDefault: false,
  displayName: "Featured Product Card",
  contentType: "ProductCardBlock",
  tag: "Featured",
  settings: {
    showIcon: {
      editor: "checkbox",
      displayName: "Show Icon",
      sortOrder: 0,
      choices: {},
    },
  },
});

// --- FeatureItemBlock --------------------------------------------------------

export const FeatureItemBlockType = contentType({
  key: "FeatureItemBlock",
  displayName: "Feature Item",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description" },
  },
});

export const FeatureItemOutlinedTemplate = displayTemplate({
  key: "FeatureItemOutlinedTemplate",
  isDefault: false,
  displayName: "Outlined Feature Item",
  contentType: "FeatureItemBlock",
  tag: "Outlined",
  settings: {},
});

export const FeatureItemFlatTemplate = displayTemplate({
  key: "FeatureItemFlatTemplate",
  isDefault: false,
  displayName: "Flat Feature Item",
  contentType: "FeatureItemBlock",
  tag: "Flat",
  settings: {},
});

// --- TestimonialBlock --------------------------------------------------------

export const TestimonialBlockType = contentType({
  key: "TestimonialBlock",
  displayName: "Testimonial",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    quote: { type: "string", displayName: "Quote", indexingType: "searchable" },
    authorName: { type: "string", displayName: "Author Name" },
    authorRole: { type: "string", displayName: "Author Role" },
    authorImage: { type: "contentReference", displayName: "Author Photo", allowedTypes: ["_image"] },
  },
});

export const TestimonialCardTemplate = displayTemplate({
  key: "TestimonialCardTemplate",
  isDefault: false,
  displayName: "Card Testimonial",
  contentType: "TestimonialBlock",
  tag: "Card",
  settings: {},
});

// --- StatsCounterBlock -------------------------------------------------------

export const StatsCounterBlockType = contentType({
  key: "StatsCounterBlock",
  displayName: "Stats Counter",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    value: { type: "string", displayName: "Value" },
    label: { type: "string", displayName: "Label" },
    suffix: { type: "string", displayName: "Suffix (e.g. %, +, K)" },
  },
});

// --- ImageBlock --------------------------------------------------------------

export const ImageBlockType = contentType({
  key: "ImageBlock",
  displayName: "Image Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    image: { type: "contentReference", displayName: "Image", allowedTypes: ["_image"] },
    altText: { type: "string", displayName: "Alt Text" },
    caption: { type: "string", displayName: "Caption" },
  },
});

export const ImageBlockRoundedTemplate = displayTemplate({
  key: "ImageBlockRoundedTemplate",
  isDefault: false,
  displayName: "Rounded Image",
  contentType: "ImageBlock",
  tag: "Rounded",
  settings: {
    aspectRatio: {
      editor: "select",
      displayName: "Aspect Ratio",
      sortOrder: 0,
      choices: {
        auto: { displayName: "Auto", sortOrder: 0 },
        "16/9": { displayName: "16:9", sortOrder: 1 },
        "4/3": { displayName: "4:3", sortOrder: 2 },
        "1/1": { displayName: "Square", sortOrder: 3 },
      },
    },
  },
});

// --- FormContainerBlock ------------------------------------------------------

export const FormContainerBlockType = contentType({
  key: "FormContainerBlock",
  displayName: "Form Container",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading" },
    description: { type: "string", displayName: "Description" },
    submitUrl: { type: "url", displayName: "Submit URL" },
    successMessage: { type: "string", displayName: "Success Message" },
  },
});

// --- FormTextInput -----------------------------------------------------------

export const FormTextInputType = contentType({
  key: "FormTextInput",
  displayName: "Text Input",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label" },
    placeholder: { type: "string", displayName: "Placeholder" },
    fieldName: { type: "string", displayName: "Field Name" },
    inputType: { type: "string", displayName: "Input Type (text, email, tel)" },
    required: { type: "boolean", displayName: "Required" },
  },
});

// --- FormTextArea ------------------------------------------------------------

export const FormTextAreaType = contentType({
  key: "FormTextArea",
  displayName: "Text Area",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label" },
    placeholder: { type: "string", displayName: "Placeholder" },
    fieldName: { type: "string", displayName: "Field Name" },
    required: { type: "boolean", displayName: "Required" },
  },
});

// --- FormSelect --------------------------------------------------------------

export const FormSelectType = contentType({
  key: "FormSelect",
  displayName: "Select Dropdown",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label" },
    fieldName: { type: "string", displayName: "Field Name" },
    options: { type: "string", displayName: "Options (comma-separated)" },
    required: { type: "boolean", displayName: "Required" },
  },
});

// --- FormSubmitButton --------------------------------------------------------

export const FormSubmitButtonType = contentType({
  key: "FormSubmitButton",
  displayName: "Submit Button",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Button Label" },
  },
});

// =============================================================================
// Structural Display Templates (Row & Column)
// =============================================================================

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

// =============================================================================
// Build Config
// =============================================================================

export default buildConfig({
  components: ["./src/components/**/*.tsx"],
});
