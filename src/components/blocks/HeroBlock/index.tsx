import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { HeroBlockClient } from "./HeroBlockClient";

export const HeroBlockType = contentType({
  key: "HeroBlock",
  displayName: "Hero Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    headline: { type: "string", displayName: "Headline", indexingType: "searchable", isLocalized: true },
    subheadline: { type: "string", displayName: "Subheadline", indexingType: "searchable", isLocalized: true },
    backgroundImage: { type: "contentReference", displayName: "Background Image", allowedTypes: ["_image"], indexingType: "disabled" },
    rendition: {
      type: "string",
      displayName: "Image Rendition",
      enum: [
        { value: "original",    displayName: "Original" },
        { value: "thumbnail",   displayName: "Thumbnail" },
        { value: "medium",      displayName: "Medium" },
        { value: "banner-wide", displayName: "Banner (wide)" },
        { value: "square",      displayName: "Square" },
      ],
    },
    ctaText: { type: "string", displayName: "CTA Text", isLocalized: true },
    ctaLink: { type: "string", displayName: "CTA Link" },
  },
});

export const HeroCenteredTemplate = displayTemplate({
  key: "HeroCenteredTemplate",
  isDefault: false,
  displayName: "Centered layout",
  contentType: "HeroBlock",
  tag: "Centered",
  settings: {
    height: {
      editor: "select",
      displayName: "Height",
      sortOrder: 0,
      choices: {
        default: { displayName: "Default", sortOrder: 0 },
        tall: { displayName: "Full screen height", sortOrder: 1 },
      },
    },
    overlay: {
      editor: "checkbox",
      displayName: "Darken background image",
      sortOrder: 1,
      choices: {},
    },
  },
});

interface HeroBlockData {
  headline?: string | null;
  subheadline?: string | null;
  heading?: string | null;
  summary?: string | null;
  backgroundImage?: {
    _metadata?: { url?: { default?: string | null } | null } | null;
    url?: { default?: string | null } | null;
    Url?: string | null;
    Renditions?: Array<{ Name?: string | null; Url?: string | null; Width?: number | null; Height?: number | null }> | null;
  } | null;
  rendition?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  __context?: { edit?: boolean } | null;
}

type HeroBlockProps = HeroBlockData & {
  content?: HeroBlockData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function HeroBlock(props: HeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const title = data.headline ?? data.heading;
  const subtitle = data.subheadline ?? data.summary;
  const renditions = data.backgroundImage?.Renditions ?? [];
  const matched = renditions.find((r) => r.Name === data.rendition);
  const bgUrl =
    matched?.Url ??
    data.backgroundImage?.Url ??
    data.backgroundImage?._metadata?.url?.default ??
    data.backgroundImage?.url?.default;

  const isCentered = props.displayTemplateKey === "HeroCenteredTemplate";
  const isTall = ds?.height === "tall";
  const showOverlay = ds?.overlay === true;

  // CMS data is resolved server-side (ISR-cacheable); the four hero experiments are
  // decided client-side in HeroBlockClient so this stays out of the cookie path.
  // Preview attributes (empty in published mode) are passed through so edit mode works.
  return (
    <HeroBlockClient
      title={title}
      subtitle={subtitle}
      bgUrl={bgUrl}
      ctaText={data.ctaText}
      ctaLink={data.ctaLink}
      isCentered={isCentered}
      isTall={isTall}
      showOverlay={showOverlay}
      edit={!!data.__context?.edit}
      paHeadline={pa("headline")}
      paSubheadline={pa("subheadline")}
      paCtaText={pa("ctaText")}
      paCtaLink={pa("ctaLink")}
    />
  );
}
