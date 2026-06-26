import { contentType } from "@optimizely/cms-sdk";

export { default } from "./ContactForm";

export const ContactFormBlockType = contentType({
  key: "ContactFormBlock",
  displayName: "Contact Form",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading:        { type: "string", displayName: "Heading",             indexingType: "searchable", isLocalized: true },
    intro:          { type: "string", displayName: "Intro",               indexingType: "searchable", isLocalized: true },
    submitLabel:    { type: "string", displayName: "Submit Button Label", indexingType: "searchable", isLocalized: true },
    successMessage: { type: "string", displayName: "Success Message",      indexingType: "searchable", isLocalized: true },
    submitUrl:      { type: "url",    displayName: "Submit URL" },
  },
});
