"use client";
import { useEffect } from "react";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { readCookie } from "@/lib/tracking/cookies";
import { browserFxAttributes, VISITOR_ID_COOKIE } from "@/lib/optimizely/fxAttributes";
import { clearVariation, recordVariation } from "@/lib/tracking/activeVariations";

export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  useEffect(() => {
    const userId = readCookie(VISITOR_ID_COOKIE);
    if (!userId) return;

    // The rule key this decision resolved to, captured so cleanup drops the same
    // entry it added. Rollouts have no rule, hence the flag-key fallback.
    let recordedKey: string | null = null;
    let active = true;

    void getOptimizelyBrowserClient().then((client) => {
      if (!active || !client) return;
      // Same attributes middleware used to pick the served variation (fxAttributes.ts).
      const ctx = client.createUserContext(userId, browserFxAttributes());
      const decision = ctx?.decide(flagKey, []); // fire bucketing event for this flag only

      // Report only what this visitor was actually served. The browser can bucket
      // differently than the server, and recording an unserved variation would tag
      // every later event with something the visitor never saw.
      if (!active || !decision?.enabled || !decision.variationKey) return;

      recordedKey = decision.ruleKey ?? decision.flagKey;
      recordVariation(recordedKey, decision.variationKey);
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: "optimizely_decision",
        optimizely_flag: decision.flagKey,
        optimizely_rule: recordedKey,
        optimizely_variation: decision.variationKey,
      });
    });

    return () => {
      active = false;
      if (recordedKey) clearVariation(recordedKey);
    };
  }, [flagKey]);

  return null;
}
