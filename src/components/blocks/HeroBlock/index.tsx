import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

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

  const isCentered = ds?.alignment === "center";
  const isTall = ds?.height === "tall";
  const showOverlay = ds?.overlay === true;

  return (
    <section
      data-component="HeroBlock"
      className={`w-screen ml-[calc(50%-50vw)] bg-gradient-brand relative flex items-center overflow-hidden ${isTall ? "min-h-screen" : "min-h-[640px]"}`}
    >
      {bgUrl && (
        <Image
          src={bgUrl}
          alt={data.headline ?? ""}
          fill
          sizes="100vw"
          className={`object-cover ${showOverlay ? "opacity-20" : "opacity-30"}`}
          priority
        />
      )}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-8 py-32 w-full ${isCentered ? "text-center" : ""}`}
      >
        <div className={isCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {title && (
            <h1
              {...pa("headline")}
              className="font-display text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              {...pa("subheadline")}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed text-on-brand-subtle"
            >
              {subtitle}
            </p>
          )}
          {(data.ctaLink || data.__context?.edit) && (
            <div>
              <a
                href={data.__context?.edit ? undefined : (data.ctaLink ?? undefined)}
                className="hover-lift font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
              >
                <span {...pa("ctaText")}>{data.ctaText ?? "Learn More"}</span>
              </a>
              {data.__context?.edit && (
                <p
                  {...pa("ctaLink")}
                  className="mt-2 text-xs font-mono text-on-brand-subtle/70 cursor-pointer hover:text-on-brand-subtle transition-colors"
                >
                  {data.ctaLink || "Click to set CTA link…"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
