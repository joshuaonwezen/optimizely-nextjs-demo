"use client";

import Link from "next/link";
import type { FxBannerData } from "./index";

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
    return (
      <div data-component="GlobalBanner" className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-gradient-brand text-on-brand">
        <span>{fxBanner.message}</span>
        {fxBanner.linkText && (
          <span className="underline underline-offset-2 font-semibold opacity-80">
            {fxBanner.linkText}
          </span>
        )}
      </div>
    );
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
