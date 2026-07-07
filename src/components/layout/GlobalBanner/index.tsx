import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import Link from "next/link";
import { GlobalBannerClient } from "./GlobalBannerClient";

export const SiteBannerType = contentType({
  key: "SiteBanner",
  displayName: "Site Banner",
  baseType: "_component",
  // Placeable as an element in Visual Builder compositions - the banner is
  // not rendered site-wide; editors drop it onto specific pages.
  compositionBehaviors: ["elementEnabled"],
  properties: {
    message:  { type: "string",  displayName: "Message", isLocalized: true },
    // queryable: getSiteBanner (used by /demo/error-handling) filters on it
    enabled:  { type: "boolean", displayName: "Enabled", indexingType: "queryable" },
    variant:  { type: "string",  displayName: "Variant (info / warning / success / brand)" },
    linkText: { type: "string",  displayName: "Link Text", isLocalized: true },
    linkUrl:  { type: "string",  displayName: "Link URL" },
  },
});

const VARIANT_CLASSES: Record<string, string> = {
  brand:   "bg-gradient-brand text-on-brand",
  info:    "bg-brand/10 text-brand",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
};

interface SiteBannerData {
  message?: string | null;
  enabled?: boolean | null;
  variant?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

type SiteBannerBlockProps = SiteBannerData & { content?: SiteBannerData };

// Renders the SiteBanner block inside page compositions (and as the CMS edit
// preview). FX-aware: when the "banner" flag serves a banner1-4 variation for
// the visitor, that FX variant renders in place of the CMS content; otherwise
// the CMS-configured strip shows. The Enabled toggle hides the placement
// entirely (FX included) without removing the block.
export function SiteBannerBlock(props: SiteBannerBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as Parameters<typeof getPreviewUtils>[0]);

  if (data.enabled === false || !data.message) return null;

  const variantClass = VARIANT_CLASSES[data.variant ?? "info"] ?? VARIANT_CLASSES.info;

  const cmsStrip = (
    <div data-component="SiteBannerBlock" className={`h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 ${variantClass}`}>
      <span {...pa("message")}>{data.message}</span>
      {data.linkText && data.linkUrl && (
        <Link
          href={data.linkUrl}
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
        >
          <span {...pa("linkText")}>{data.linkText}</span>
        </Link>
      )}
    </div>
  );

  return <GlobalBannerClient fallback={cmsStrip} />;
}

// Site-wide chrome slot: only the FX banner experiment renders here. The CMS
// SiteBanner block is placed on specific pages via Visual Builder instead
// (rendered by SiteBannerBlock through the component registry).
export default function GlobalBanner() {
  return <GlobalBannerClient />;
}
