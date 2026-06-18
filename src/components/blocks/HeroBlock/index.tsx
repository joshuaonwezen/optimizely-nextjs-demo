import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { getOptimizelyUser } from "@/lib/optimizely/user";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

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

export default async function HeroBlock(props: HeroBlockProps) {
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

  // FX experiments
  const user = await getOptimizelyUser();
  const heroCopy       = user.decide("hero_copy");
  const heroLayout     = user.decide("hero_layout");
  const heroDualCta    = user.decide("hero_dual_cta");
  const heroSocialProof = user.decide("hero_social_proof");

  // hero_copy: use flag value when non-empty, else fall back to CMS content
  const displayTitle    = (heroCopy.enabled && (heroCopy.variables.headline as string))    || title;
  const displaySubtitle = (heroCopy.enabled && (heroCopy.variables.subheadline as string)) || subtitle;

  // hero_layout: override to centered when flag says so
  const effectiveCentered = isCentered || (heroLayout.enabled && (heroLayout.variables.layout as string) === "centered");

  // hero_dual_cta: secondary ghost CTA when variables are populated
  const secondaryLabel = heroDualCta.enabled ? (heroDualCta.variables.secondaryLabel as string) || "" : "";
  const secondaryUrl   = heroDualCta.enabled ? (heroDualCta.variables.secondaryUrl   as string) || "" : "";

  // hero_social_proof: trust strip shown only for treatment bucket
  const showSocialProof = heroSocialProof.enabled && heroSocialProof.variationKey === "treatment";

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
          className={`object-cover ${showOverlay ? "opacity-10" : "opacity-50"}`}
          priority
        />
      )}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-8 py-32 w-full ${effectiveCentered ? "text-center" : ""}`}
      >
        <div className={effectiveCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {displayTitle && (
            <h1
              {...pa("headline")}
              className="font-display text-5xl md:text-6xl lg:text-[3.5rem] font-extrabold leading-tight mb-8 text-on-brand"
            >
              {displayTitle}
            </h1>
          )}
          {displaySubtitle && (
            <p
              {...pa("subheadline")}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed text-on-brand-subtle"
            >
              {displaySubtitle}
            </p>
          )}
          {(data.ctaLink || data.__context?.edit || secondaryLabel) && (
            <div className={`flex gap-4 flex-wrap ${effectiveCentered ? "justify-center" : ""}`}>
              {(data.ctaLink || data.__context?.edit) && (
                <a
                  href={data.__context?.edit ? undefined : (data.ctaLink ?? undefined)}
                  className="hover-lift font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
                >
                  <span {...pa("ctaText")}>{data.ctaText ?? "Learn More"}</span>
                </a>
              )}
              {secondaryLabel && secondaryUrl && (
                <a
                  href={secondaryUrl}
                  className="font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg border-2 border-white/30 text-on-brand hover:bg-white/10 transition-colors"
                >
                  {secondaryLabel}
                </a>
              )}
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
          {showSocialProof && (
            <div className={`mt-10 flex flex-wrap gap-3 ${effectiveCentered ? "justify-center" : ""}`}>
              {[
                { stat: "4.9★", label: "rated" },
                { stat: "2M+",  label: "customers" },
                { stat: "$0",   label: "monthly fees" },
                { stat: "FDIC", label: "insured" },
              ].map(({ stat, label }) => (
                <span key={stat} className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5">
                  <span className="text-on-brand font-bold text-sm">{stat}</span>
                  <span className="text-on-brand-subtle text-sm">{label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {heroCopy.enabled       && <FxBucketingEvent flagKey="hero_copy" />}
      {heroLayout.enabled     && <FxBucketingEvent flagKey="hero_layout" />}
      {heroDualCta.enabled    && <FxBucketingEvent flagKey="hero_dual_cta" />}
      {heroSocialProof.enabled && <FxBucketingEvent flagKey="hero_social_proof" />}
    </section>
  );
}
