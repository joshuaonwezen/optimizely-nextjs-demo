import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { readCookie } from "../cookies";
import type { TrackingDestination } from "../types";

export const fxDestination: TrackingDestination = {
  name: "Feature Experimentation",
  async send(event) {
    const client = await getOptimizelyBrowserClient();
    if (!client) return "skipped";
    await client.onReady();
    const attributes: Record<string, string> = {};
    const persona = readCookie("demo_persona");
    if (persona) attributes.persona = persona;
    const user = client.createUserContext(event.userId, attributes);
    if (!user) return "skipped";
    user.trackEvent(event.key, event.tags);
    return "sent";
  },
};
