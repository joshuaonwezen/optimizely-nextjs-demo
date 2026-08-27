import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { HeroBlockClient } from "./HeroBlockClient";
import { resolveLinkHref } from "@/lib/optimizely/resolveLinkHref";
import { BACKGROUND_BRAND_DEFAULT, TEXT_COLOR, HEADING_SIZE, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";

export const HeroBlockType = contentType({
  key: "HeroBlock",
  displayName: "Hero Block",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    headline: { type: "string", displayName: "Headline", indexingType: "searchable", isLocalized: true },
    subheadline: { type: "string", displayName: "Subheadline", indexingType: "searchable", isLocalized: true },
    // No indexingType: indexingType:"disabled" makes the SDK omit the reference
    // from its generated fragment, so the image is never queried. Omit it.
    backgroundImage: { type: "contentReference", displayName: "Background Image", allowedTypes: ["_image"] },
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
    ctaText: { type: "string", displayName: "CTA Text", isLocalized: true, sortOrder: 100 },
    // Native link picker: internal page selection + external/anchor/email URLs.
    // Resolve at render with resolveLinkHref() (internal refs come back as cms://).
    ctaLink: { type: "url", displayName: "Link", sortOrder: 110 },
  },
});

export const HeroBlockDefaultTemplate = displayTemplate({
  key: "HeroBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "HeroBlock",
  settings: {
    alignment: {
      editor: "select",
      displayName: "Text alignment",
      sortOrder: 10,
      choices: {
        left:   { displayName: "Left",   sortOrder: 0 },
        center: { displayName: "Center", sortOrder: 1 },
      },
    },
    height: {
      editor: "select",
      displayName: "Height",
      sortOrder: 11,
      choices: {
        default: { displayName: "Default",           sortOrder: 0 },
        tall:    { displayName: "Full screen height", sortOrder: 1 },
      },
    },
    overlay: {
      editor: "checkbox",
      displayName: "Darken background image",
      sortOrder: 12,
      choices: {},
    },
    ...BACKGROUND_BRAND_DEFAULT,
    ...TEXT_COLOR,
    ...HEADING_SIZE,
    ...FONT_STYLE,
  },
});

interface HeroBlockData {
  headline?: string | null;
  subheadline?: string | null;
  heading?: string | null;
  summary?: string | null;
  // DAM background lives under backgroundImage.item (read by src()); url/_metadata
  // fallbacks cover CMS globalassets.
  backgroundImage?: {
    url?: { default?: string | null } | null;
    _metadata?: { url?: { default?: string | null } | null } | null;
  } | null;
  rendition?: string | null;
  ctaText?: string | null;
  // type:"url" link — Graph returns { default, hierarchical }.
  ctaLink?: { default?: string | null; hierarchical?: string | null } | null;
  __context?: { edit?: boolean } | null;
}

type HeroBlockProps = HeroBlockData & {
  content?: HeroBlockData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default async function HeroBlock(props: HeroBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa, src } = getPreviewUtils(data as any);
  const title = data.headline ?? data.heading;
  const subtitle = data.subheadline ?? data.summary;
  // src() resolves the DAM asset URL + preview token; fallbacks cover globalassets.
  const bgUrl =
    src(data.backgroundImage as any) ??
    data.backgroundImage?.url?.default ??
    data.backgroundImage?._metadata?.url?.default;

  const isCentered = ds?.alignment === "center";
  const isTall = ds?.height === "tall";
  const showOverlay = ds?.overlay === true;
  const headingSize = (ds?.headingSize as string) ?? "xl";
  const fontStyle = (ds?.fontStyle as string) ?? "modern";
  const style = resolveStyleClasses(ds, { background: "blueGrad", headingSize: "xl" });
  // Resolve the link picker (internal refs come back as cms://content/{key}).
  const ctaHref = await resolveLinkHref(data.ctaLink);

  // CMS data is resolved server-side (ISR-cacheable); the four hero experiments are
  // decided client-side in HeroBlockClient so this stays out of the cookie path.
  // Preview attributes (empty in published mode) are passed through so edit mode works.
  return (
    <HeroBlockClient
      surfaceClass={style.wrapper}
      textClass={style.text}
      textMutedClass={style.textMuted}
      title={title}
      subtitle={subtitle}
      bgUrl={bgUrl}
      ctaText={data.ctaText}
      ctaHref={ctaHref}
      isCentered={isCentered}
      isTall={isTall}
      showOverlay={showOverlay}
      headingSize={headingSize}
      fontStyle={fontStyle}
      edit={!!data.__context?.edit}
      paHeadline={pa("headline")}
      paSubheadline={pa("subheadline")}
      paCtaText={pa("ctaText")}
      paCtaLink={pa("ctaLink")}
    />
  );
}
