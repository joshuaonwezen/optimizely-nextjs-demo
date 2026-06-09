import { contentType } from "@optimizely/cms-sdk";
import { getSiteBanner } from "@/lib/graphql/queries/GetSiteBanner";
import { getOptimizelyUser } from "@/lib/optimizely/user";
import { GlobalBannerClient } from "./GlobalBannerClient";

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

export interface FxBannerData {
  message: string;
  linkText?: string | null;
}

export default async function GlobalBanner() {
  const [cmsBanner, user] = await Promise.all([getSiteBanner(), getOptimizelyUser()]);

  const fxDecision = user.decide("banner", []); // [] fires the bucketing impression
  let fxBanner: FxBannerData | null = null;
  if (fxDecision.enabled) {
    const v = fxDecision.variables;
    const message = (v.title as string) || (v.description as string) || "";
    if (message) {
      fxBanner = { message, linkText: v.linkText as string | null | undefined };
    }
  }

  return <GlobalBannerClient cmsBanner={cmsBanner} fxBanner={fxBanner} />;
}
