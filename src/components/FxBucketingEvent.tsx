"use client";
import { useEffect } from "react";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { readCookie } from "@/lib/tracking/cookies";

export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  useEffect(() => {
    const userId = readCookie("optimizelyEndUserId");
    if (!userId) return;

    void getOptimizelyBrowserClient().then((client) => {
      if (!client) return;
      // These attributes must mirror src/middleware.ts, which produced the served
      // variation. If they drift, the client can bucket into a different variation
      // than was rendered and record a ghost impression.
      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const demoPersona = readCookie("demo_persona");
      const ctx = client.createUserContext(userId, {
        device,
        hostname: window.location.hostname,
        logged_in: !!readCookie("demo_bucketing_id"),
        ...(demoPersona ? { persona: demoPersona } : {}),
      });
      ctx?.decide(flagKey, []); // fire bucketing event for this flag only
    });
  }, [flagKey]);

  return null;
}
