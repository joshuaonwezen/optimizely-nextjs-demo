import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { browserFxAttributes } from "@/lib/optimizely/fxAttributes";
import type { TrackingDestination } from "../types";

export const fxDestination: TrackingDestination = {
  name: "Feature Experimentation",
  async send(event) {
    const client = await getOptimizelyBrowserClient();
    if (!client) return "skipped";
    await client.onReady();
    // Events carry the same attributes as decisions, so results can be segmented by them.
    const user = client.createUserContext(event.userId, browserFxAttributes());
    if (!user) return "skipped";
    user.trackEvent(event.key, event.tags);
    return "sent";
  },
};
