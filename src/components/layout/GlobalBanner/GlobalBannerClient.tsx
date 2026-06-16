"use client";

import Link from "next/link";
import type { FxBannerData } from "./index";
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

export function GlobalBannerClient({
  cmsBanner,
  fxBanner,
}: {
  cmsBanner: CmsBanner | null;
  fxBanner: FxBannerData | null;
}) {
  if (fxBanner) {
    if (fxBanner.variation === "banner_1") return <Banner1 message={fxBanner.message} linkText={fxBanner.linkText} />;
    if (fxBanner.variation === "banner_2") return <Banner2 message={fxBanner.message} linkText={fxBanner.linkText} />;
    if (fxBanner.variation === "banner_3") return <Banner3 message={fxBanner.message} linkText={fxBanner.linkText} />;
    if (fxBanner.variation === "banner_4") return <Banner4 message={fxBanner.message} linkText={fxBanner.linkText} />;
  }

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
