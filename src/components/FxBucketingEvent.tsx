"use client";
import { useEffect } from "react";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";

function getCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  useEffect(() => {
    const userId = getCookie("optimizelyEndUserId");
    if (!userId) return;

    void getOptimizelyBrowserClient().then((client) => {
      if (!client) return;
      // These attributes must mirror src/middleware.ts, which produced the served
      // variation. If they drift, the client can bucket into a different variation
      // than was rendered and record a ghost impression.
      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const demoPersona = getCookie("demo_persona");
      const ctx = client.createUserContext(userId, {
        device,
        hostname: window.location.hostname,
        logged_in: !!getCookie("demo_bucketing_id"),
        ...(demoPersona ? { persona: demoPersona } : {}),
      });
      ctx?.decide(flagKey, []); // fire bucketing event for this flag only
    });
  }, [flagKey]);

  return null;
}
