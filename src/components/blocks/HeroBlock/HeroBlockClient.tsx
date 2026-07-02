"use client";

import Image from "next/image";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { HEADING_CLASSES, FONT_CLASSES } from "../_shared/displayTemplateSettings";

// Preview-attribute objects from the SDK's pa() helper (empty in published mode).
type PreviewAttrs = Record<string, string | undefined>;

export interface HeroBlockClientProps {
  title?: string | null;
  subtitle?: string | null;
  bgUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  isCentered: boolean;
  isTall: boolean;
  showOverlay: boolean;
  headingSize?: string;
  fontStyle?: string;
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
  ctaLink,
  isCentered,
  isTall,
  showOverlay,
  headingSize = "xl",
  fontStyle = "modern",
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
      className={`w-screen ml-[calc(50%-50vw)] bg-gradient-brand relative flex items-center overflow-hidden ${isTall ? "min-h-screen" : "min-h-[640px]"}`}
    >
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
      <div
        className={`relative z-10 max-w-7xl mx-auto px-8 py-32 w-full ${effectiveCentered ? "text-center" : ""}`}
      >
        <div className={effectiveCentered ? "max-w-3xl mx-auto" : "max-w-3xl"}>
          {displayTitle && (
            <h1
              {...paHeadline}
              className={`${titleFontClass} ${titleSizeClass} font-extrabold leading-tight mb-8 text-on-brand`}
            >
              {displayTitle}
            </h1>
          )}
          {displaySubtitle && (
            <p
              {...paSubheadline}
              className="text-xl md:text-2xl mb-12 max-w-2xl leading-relaxed text-on-brand-subtle"
            >
              {displaySubtitle}
            </p>
          )}
          {(ctaLink || edit || secondaryLabel) && (
            <div className={`flex gap-4 flex-wrap ${effectiveCentered ? "justify-center" : ""}`}>
              {(ctaLink || edit) && (
                <a
                  href={edit ? undefined : (ctaLink ?? undefined)}
                  data-track-event="mb_hero_cta_click"
                  data-track-tags={JSON.stringify({ label: ctaText ?? "", placement: "primary" })}
                  className="hover-lift font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg bg-surface-lowest text-brand"
                >
                  <span {...paCtaText}>{ctaText ?? "Learn More"}</span>
                </a>
              )}
              {secondaryLabel && secondaryUrl && (
                <a
                  href={secondaryUrl}
                  data-track-event="mb_hero_cta_click"
                  data-track-tags={JSON.stringify({ label: secondaryLabel, placement: "secondary" })}
                  className="font-display inline-block px-8 py-4 rounded-lg font-semibold text-lg border-2 border-white/30 text-on-brand hover:bg-white/10 transition-colors"
                >
                  {secondaryLabel}
                </a>
              )}
              {edit && (
                <p
                  {...paCtaLink}
                  className="mt-2 text-xs font-mono text-on-brand-subtle/70 cursor-pointer hover:text-on-brand-subtle transition-colors"
                >
                  {ctaLink || "Click to set CTA link…"}
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
      {heroCopy?.enabled        && <FxBucketingEvent flagKey="hero_copy" />}
      {heroLayout?.enabled      && <FxBucketingEvent flagKey="hero_layout" />}
      {heroDualCta?.enabled     && <FxBucketingEvent flagKey="hero_dual_cta" />}
      {heroSocialProof?.enabled && <FxBucketingEvent flagKey="hero_social_proof" />}
    </section>
  );
}
