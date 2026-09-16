"use client";
import { useEffect } from "react";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { readCookie } from "@/lib/tracking/cookies";
import { browserFxAttributes, VISITOR_ID_COOKIE } from "@/lib/optimizely/fxAttributes";

export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  useEffect(() => {
    const userId = readCookie(VISITOR_ID_COOKIE);
    if (!userId) return;

    void getOptimizelyBrowserClient().then((client) => {
      if (!client) return;
      // Same attributes middleware used to pick the served variation (fxAttributes.ts).
      const ctx = client.createUserContext(userId, browserFxAttributes());
      ctx?.decide(flagKey, []); // fire bucketing event for this flag only
    });
  }, [flagKey]);

  return null;
}
