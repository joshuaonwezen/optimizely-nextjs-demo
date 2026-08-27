"use client";

import Image from "next/image";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { HEADING_CLASSES, FONT_CLASSES } from "../_shared/displayTemplateSettings";
import { Button } from "@/components/ui/Button";

// Preview-attribute objects from the SDK's pa() helper (empty in published mode).
type PreviewAttrs = Record<string, string | undefined>;

export interface HeroBlockClientProps {
  title?: string | null;
  subtitle?: string | null;
  bgUrl?: string | null;
  ctaText?: string | null;
  ctaHref?: string | null;
  isCentered: boolean;
  isTall: boolean;
  showOverlay: boolean;
  headingSize?: string;
  fontStyle?: string;
  surfaceClass?: string;
  textClass?: string;
  textMutedClass?: string;
  edit: boolean;
  paHeadline?: PreviewAttrs;
  paSubheadline?: PreviewAttrs;
  paCtaText?: PreviewAttrs;
  paCtaLink?: PreviewAttrs;
}

export function HeroBlockClient({
  title,
  subtitle,
  bgUrl,
  ctaText,
  ctaHref,
  isCentered,
  isTall,
  showOverlay,
  headingSize = "xl",
  fontStyle = "modern",
  surfaceClass = "bg-gradient-brand",
  textClass = "text-on-brand",
  textMutedClass = "text-on-brand-subtle",
  edit,
  paHeadline = {},
  paSubheadline = {},
  paCtaText = {},
  paCtaLink = {},
}: HeroBlockClientProps) {
  const titleSizeClass = HEADING_CLASSES[headingSize] ?? HEADING_CLASSES.xl;
  const titleFontClass = FONT_CLASSES[fontStyle] ?? FONT_CLASSES.modern;
  // FX experiments, decided client-side. Each is null until the datafile loads —
  // the SSR/default render uses the CMS/control content.
  const heroCopy        = useFxDecision("hero_copy");
  const heroLayout      = useFxDecision("hero_layout");
  const heroDualCta     = useFxDecision("hero_dual_cta");
  const heroSocialProof = useFxDecision("hero_social_proof");

  // hero_copy: use flag value when non-empty, else fall back to CMS content
  const displayTitle    = (heroCopy?.enabled && (heroCopy.variables.headline as string))    || title;
  const displaySubtitle = (heroCopy?.enabled && (heroCopy.variables.subheadline as string)) || subtitle;

  // hero_layout: override to centered when flag says so
  const effectiveCentered = isCentered || (!!heroLayout?.enabled && (heroLayout.variables.layout as string) === "centered");

  // hero_dual_cta: secondary ghost CTA when variables are populated
  const secondaryLabel = heroDualCta?.enabled ? (heroDualCta.variables.secondaryLabel as string) || "" : "";
  const secondaryUrl   = heroDualCta?.enabled ? (heroDualCta.variables.secondaryUrl   as string) || "" : "";

  // hero_social_proof: trust strip shown only for treatment bucket
  const showSocialProof = !!heroSocialProof?.enabled && heroSocialProof.variationKey === "treatment";

  return (
    <section
      data-component="HeroBlock"
      data-track-view="HeroBlock"
      className={`relative flex items-center ${isTall ? "min-h-screen" : ""}`}
    >
      {/* Full-bleed background — absolutely positioned so it doesn't affect document scrollWidth */}
      <div className={`absolute inset-y-0 w-screen ml-[calc(50%-50vw)] ${surfaceClass} overflow-hidden`}>
        {bgUrl && (
          <Image
            src={bgUrl}
            alt={title ?? ""}
            fill
            sizes="100vw"
            className={`object-cover ${showOverlay ? "opacity-10" : "opacity-50"}`}
            priority
          />
        )}
      </div>
      <div
        className={`relative z-10 max-w-7xl mx-auto px-8 py-20 w-full ${effectiveCentered ? "text-center" : ""}`}
      >
        <div className={effectiveCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {displayTitle && (
            <h1
              {...paHeadline}
              className={`${titleFontClass} ${titleSizeClass} font-extrabold leading-tight mb-8 ${textClass}`}
            >
              {displayTitle}
            </h1>
          )}
          {displaySubtitle && (
            <p
              {...paSubheadline}
              className={`text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed ${textMutedClass}`}
            >
              {displaySubtitle}
            </p>
          )}
          {(ctaHref || edit || secondaryLabel) && (
            <div className={`flex gap-4 flex-wrap ${effectiveCentered ? "justify-center" : ""}`}>
              {(ctaHref || edit) && (
                <Button
                  href={edit ? undefined : (ctaHref ?? undefined)}
                  variant="surface"
                  size="large"
                  data-track-event="mb_hero_cta_click"
                  data-track-tags={JSON.stringify({ label: ctaText ?? "", placement: "primary" })}
                  {...paCtaLink}
                >
                  <span {...paCtaText}>{ctaText ?? "Learn More"}</span>
                </Button>
              )}
              {secondaryLabel && secondaryUrl && (
                <Button
                  href={secondaryUrl}
                  variant="ghost"
                  size="large"
                  className={textClass}
                  data-track-event="mb_hero_cta_click"
                  data-track-tags={JSON.stringify({ label: secondaryLabel, placement: "secondary" })}
                >
                  {secondaryLabel}
                </Button>
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
                <span key={stat} className="inline-flex items-center gap-1.5 bg-on-brand/10 backdrop-blur-sm rounded-full px-4 py-1.5">
                  <span className={`${textClass} font-bold text-sm`}>{stat}</span>
                  <span className={`${textMutedClass} text-sm`}>{label}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {heroCopy?.enabled        && <FxBucketingEvent flagKey="hero_copy" />}
      {heroLayout?.enabled      && <FxBucketingEvent flagKey="hero_layout" />}
      {heroDualCta?.enabled     && <FxBucketingEvent flagKey="hero_dual_cta" />}
      {heroSocialProof?.enabled && <FxBucketingEvent flagKey="hero_social_proof" />}
    </section>
  );
}
