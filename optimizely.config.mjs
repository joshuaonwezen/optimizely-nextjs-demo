import {
  buildConfig,
  contentType,
  displayTemplate,
} from "@optimizely/cms-sdk";

export const DynamicExperienceType = contentType({
  key: "DynamicExperience",
  displayName: "Dynamic Experience",
  baseType: "_experience",
  properties: {
    lastSync: { type: "dateTime", displayName: "Last Sync" },
  },
});

export const LandingPageType = contentType({
  key: "LandingPage",
  displayName: "Landing Page",
  baseType: "_page",
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
