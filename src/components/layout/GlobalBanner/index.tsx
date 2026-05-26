import Link from "next/link";
import { cookies } from "next/headers";
import { contentType } from "@optimizely/cms-sdk";
import { getSiteBanner } from "@/lib/graphql/queries/GetSiteBanner";
import { getDecision, bucketVisitor } from "@/lib/optimizely/experimentation";

export const SiteBannerType = contentType({
  key: "SiteBanner",
  displayName: "Site Banner",
  baseType: "_component",
  properties: {
    message:  { type: "string",  displayName: "Message" },
    enabled:  { type: "boolean", displayName: "Enabled" },
    variant:  { type: "string",  displayName: "Variant (info / warning / success / brand)" },
    linkText: { type: "string",  displayName: "Link Text" },
    linkUrl:  { type: "string",  displayName: "Link URL" },
  },
});

const VARIANT_CLASSES: Record<string, string> = {
  brand:   "bg-gradient-brand text-on-brand",
  info:    "bg-brand/10 text-brand",
  warning: "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
};

export default async function GlobalBanner() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";

  // FX flag takes priority over CMS banner when enabled
  const fxDecision = await getDecision("banner", userId, { device, logged_in: false });
  if (fxDecision.enabled) {
    const v = fxDecision.variables;
    const message = (v.title as string) || (v.description as string) || "";
    const linkText = v.linkText as string | undefined;
    if (!message) return null;
    void bucketVisitor("banner", userId, { device, logged_in: false });
    return (
      <div className="h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 bg-gradient-brand text-on-brand">
        <span>{message}</span>
        {linkText && (
          <span className="underline underline-offset-2 font-semibold opacity-80">
            {linkText}
          </span>
        )}
      </div>
    );
  }

  // Fallback: CMS-managed banner
  const banner = await getSiteBanner();
  if (!banner || !banner.enabled || !banner.message) return null;

  const variantClass = VARIANT_CLASSES[banner.variant ?? "info"] ?? VARIANT_CLASSES.info;

  return (
    <div className={`h-9 flex items-center justify-center text-sm font-medium gap-2 px-4 ${variantClass}`}>
      <span>{banner.message}</span>
      {banner.linkText && banner.linkUrl && (
        <Link
          href={banner.linkUrl}
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
        >
          {banner.linkText}
        </Link>
      )}
    </div>
  );
}
