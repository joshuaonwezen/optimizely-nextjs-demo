"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";

interface CmsBanner {
  message?: string | null;
  enabled?: boolean | null;
  variant?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

interface BannerState {
  message: string;
  linkText?: string | null;
  linkUrl?: string | null;
  variant?: string | null;
  isFx: boolean;
}

const VARIANT_CLASSES: Record<string, string> = {
  brand:   "bg-gradient-brand text-on-brand",
  info:    "bg-brand/10 text-brand",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
};

function getCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

function cmsBannerToState(b: CmsBanner | null): BannerState | null {
  if (!b?.enabled || !b?.message) return null;
  return { message: b.message, linkText: b.linkText, linkUrl: b.linkUrl, variant: b.variant, isFx: false };
}

export function GlobalBannerClient({ cmsBanner }: { cmsBanner: CmsBanner | null }) {
  const [banner, setBanner] = useState<BannerState | null>(() => cmsBannerToState(cmsBanner));

  useEffect(() => {
    void (async () => {
      const userId = getCookie("optimizelyEndUserId");
      if (!userId) return;

      const client = await getOptimizelyBrowserClient();
      if (!client) return;

      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const demoPersona = getCookie("demo_persona");
      const bucketingId = getCookie("demo_bucketing_id");
      const ctx = client.createUserContext(userId, {
        device,
        logged_in: !!bucketingId,
        ...(demoPersona ? { persona: demoPersona } : {}),
      });
      const decision = ctx?.decide("banner", []); // [] fires the bucketing event
      if (decision?.enabled) {
        const v = decision.variables;
        const message = (v.title as string) || (v.description as string) || "";
        if (message) {
          setBanner({ message, linkText: v.linkText as string | undefined, isFx: true });
        }
      }
    })();
  }, []);

  if (!banner) return null;

  const variantClass = banner.isFx
    ? "bg-gradient-brand text-on-brand"
    : (VARIANT_CLASSES[banner.variant ?? "info"] ?? VARIANT_CLASSES.info);

  return (
    <div className={`h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 ${variantClass}`}>
      <span>{banner.message}</span>
      {banner.linkText && banner.linkUrl && !banner.isFx && (
        <Link
          href={banner.linkUrl}
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
        >
          {banner.linkText}
        </Link>
      )}
      {banner.linkText && banner.isFx && (
        <span className="underline underline-offset-2 font-semibold opacity-80">
          {banner.linkText}
        </span>
      )}
    </div>
  );
}
