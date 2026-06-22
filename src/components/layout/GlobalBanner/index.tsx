import { contentType } from "@optimizely/cms-sdk";
import { getSiteBanner } from "@/lib/graphql/queries/GetSiteBanner";
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

// CMS banner is fetched server-side (ISR-cacheable). The FX banner experiment is
// decided client-side in GlobalBannerClient so this stays out of the cookie-reading
// server render path.
export default async function GlobalBanner() {
  const cmsBanner = await getSiteBanner();
  return <GlobalBannerClient cmsBanner={cmsBanner} />;
}
