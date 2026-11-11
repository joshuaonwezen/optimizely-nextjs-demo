"use client";

import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { Banner1, Banner2, Banner3, Banner4 } from "./FxBannerVariants";

interface Props {
  /** Rendered when the FX flag serves no banner variation (e.g. the CMS strip
   *  of a placed SiteBanner block). The site-wide chrome slot passes nothing. */
  fallback?: React.ReactNode;
}

// FX "banner" experiment: renders the served banner1-4 variation, or the
// fallback when the flag is off / serves no matching variation.
export function GlobalBannerClient({ fallback = null }: Props) {
  const decision = useFxDecision("banner");
  if (!decision?.enabled) return fallback;

  const v = decision.variables;
  const message = (v.title as string) || (v.description as string) || "";
  if (!message) return fallback;

  const linkText = v.linkText as string | null | undefined;
  const variation = decision.variationKey;
  let variant: React.ReactNode = null;
  if (variation === "banner1") variant = <Banner1 message={message} linkText={linkText} />;
  else if (variation === "banner2") variant = <Banner2 message={message} linkText={linkText} />;
  else if (variation === "banner3") variant = <Banner3 message={message} linkText={linkText} />;
  else if (variation === "banner4") variant = <Banner4 message={message} linkText={linkText} />;
  if (!variant) return fallback;

  // The banners carry no link of their own, so a click anywhere on the bar is the
  // conversion the banner experiment measures.
  return (
    <div
      data-component="GlobalBannerClient"
      data-track-event="banner_click"
      data-track-tags={JSON.stringify({ variation })}
    >
      {variant}
      <FxBucketingEvent flagKey="banner" />
    </div>
  );
}
