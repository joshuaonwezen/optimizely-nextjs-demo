"use client";

import Link from "next/link";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { Banner1, Banner2, Banner3, Banner4 } from "./FxBannerVariants";

interface CmsBanner {
  message?: string | null;
  enabled?: boolean | null;
  variant?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

const VARIANT_CLASSES: Record<string, string> = {
  brand:   "bg-gradient-brand text-on-brand",
  info:    "bg-brand/10 text-brand",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
};

export function GlobalBannerClient({ cmsBanner }: { cmsBanner: CmsBanner | null }) {
  const decision = useFxDecision("banner");

  if (decision?.enabled) {
    const v = decision.variables;
    const message = (v.title as string) || (v.description as string) || "";
    if (message) {
      const linkText = v.linkText as string | null | undefined;
      const variation = decision.variationKey;
      let variant: React.ReactNode = null;
      if (variation === "banner1") variant = <Banner1 message={message} linkText={linkText} />;
      else if (variation === "banner2") variant = <Banner2 message={message} linkText={linkText} />;
      else if (variation === "banner3") variant = <Banner3 message={message} linkText={linkText} />;
      else if (variation === "banner4") variant = <Banner4 message={message} linkText={linkText} />;
      if (variant) {
        return (
          <>
            {variant}
            <FxBucketingEvent flagKey="banner" />
          </>
        );
      }
    }
  }

  // SSR default + fallback: the CMS banner (no FX variant active)
  if (!cmsBanner?.enabled || !cmsBanner?.message) return null;

  const variantClass = VARIANT_CLASSES[cmsBanner.variant ?? "info"] ?? VARIANT_CLASSES.info;

  return (
    <div data-component="GlobalBanner" className={`h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 ${variantClass}`}>
      <span>{cmsBanner.message}</span>
      {cmsBanner.linkText && cmsBanner.linkUrl && (
        <Link
          href={cmsBanner.linkUrl}
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
        >
          {cmsBanner.linkText}
        </Link>
      )}
    </div>
  );
}
