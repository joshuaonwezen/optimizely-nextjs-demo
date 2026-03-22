import { buildConfig, contentType } from "@optimizely/cms-sdk";

// ---------------------------------------------------------------------------
// Component types — used as elements inside Visual Builder experiences
// ---------------------------------------------------------------------------

export const HeroBlockType = contentType({
  key: "HeroBlock",
  displayName: "Hero Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    headline: {
      type: "string",
      displayName: "Headline",
      indexingType: "searchable",
    },
    subheadline: {
      type: "string",
      displayName: "Subheadline",
      indexingType: "searchable",
    },
    backgroundImage: {
      type: "contentReference",
      displayName: "Background Image",
      allowedTypes: ["_image"],
    },
    ctaText: {
      type: "string",
      displayName: "CTA Text",
    },
    ctaLink: {
      type: "string",
      displayName: "CTA Link",
    },
  },
});

export const CallToActionType = contentType({
  key: "CallToAction",
  displayName: "Call to Action",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label: {
      type: "string",
      displayName: "Label",
    },
    link: {
      type: "string",
      displayName: "Link",
    },
  },
});

export const TextBlockType = contentType({
  key: "TextBlock",
  displayName: "Text Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    body: {
      type: "richText",
      displayName: "Body",
    },
  },
});

export const ProductCardBlockType = contentType({
  key: "ProductCardBlock",
  displayName: "Product Card",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    icon: {
      type: "string",
      displayName: "Icon Name",
    },
    title: {
      type: "string",
      displayName: "Title",
      indexingType: "searchable",
    },
    description: {
      type: "string",
      displayName: "Description",
      indexingType: "searchable",
    },
    linkUrl: {
      type: "url",
      displayName: "Link URL",
    },
    linkText: {
      type: "string",
      displayName: "Link Text",
    },
  },
});

export const ProductHeroBlockType = contentType({
  key: "ProductHeroBlock",
  displayName: "Product Hero",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    badge: {
      type: "string",
      displayName: "Badge Text",
    },
    title: {
      type: "string",
      displayName: "Title",
      indexingType: "searchable",
    },
    description: {
      type: "string",
      displayName: "Description",
      indexingType: "searchable",
    },
    ctaText: {
      type: "string",
      displayName: "CTA Text",
    },
    ctaUrl: {
      type: "url",
      displayName: "CTA URL",
    },
  },
});

export const FeatureItemBlockType = contentType({
  key: "FeatureItemBlock",
  displayName: "Feature Item",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    title: {
      type: "string",
      displayName: "Title",
      indexingType: "searchable",
    },
    description: {
      type: "string",
      displayName: "Description",
      indexingType: "searchable",
    },
  },
});

export const SectionHeadingBlockType = contentType({
  key: "SectionHeadingBlock",
  displayName: "Section Heading",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading: {
      type: "string",
      displayName: "Heading",
      indexingType: "searchable",
    },
    subheading: {
      type: "string",
      displayName: "Subheading",
      indexingType: "searchable",
    },
  },
});

// ---------------------------------------------------------------------------
// Build config — tells the CLI where to find components for registration
// ---------------------------------------------------------------------------

export default buildConfig({
  components: ["./src/components/**/*.tsx"],
});
