import { getOptimizelyUser } from "@/lib/optimizely/user";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { StickyOfferBarClient } from "./StickyOfferBarClient";

export default async function StickyOfferBar() {
  const user = await getOptimizelyUser();
  const decision = user.decide("sticky_offer_bar");
  if (!decision.enabled) return null;

  const v = decision.variables;
  const message = (v.message as string) || "";
  if (!message) return null;

  return (
    <>
      <StickyOfferBarClient
        message={message}
        linkText={(v.linkText as string) || null}
        linkUrl={(v.linkUrl as string) || null}
        expiryLabel={(v.expiryLabel as string) || null}
      />
      <FxBucketingEvent flagKey="sticky_offer_bar" />
    </>
  );
}
