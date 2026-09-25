"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyBrowserClient } from "@/lib/optimizely/browser-client";
import { readCookie } from "@/lib/tracking/cookies";
import { browserFxAttributes, VISITOR_ID_COOKIE } from "@/lib/optimizely/fxAttributes";
import { clearVariation, recordVariation } from "@/lib/tracking/activeVariations";
import { isInactiveVariant } from "@/lib/optimizely/wxVariation";
import { cleanPathname } from "@/lib/optimizely/variationPath";

// Flags whose impression has already been reported for a given page, so a remount cannot
// report it twice. Keyed on the CLEAN path: a WX soft-nav swap navigates from /x to
// /x/__v_wx--name, which remounts this component, and measured that fired a second real
// impression for every flag the base render had already reported. A genuine navigation to
// a different page changes the key, so exposure is still counted once per pageview.
const reportedFor = new Set<string>();

export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const page = cleanPathname(usePathname());

  useEffect(() => {
    const userId = readCookie(VISITOR_ID_COOKIE);
    if (!userId) return;

    // A WX pre-paint page renders base AND the variant, and both hydrate. decide() below
    // fires a REAL impression (empty options array), so without this a hidden duplicate
    // of a block like HeroBlock - which mounts four of these - would double-count four
    // experiments on every pageview and permanently skew them. CSS does not stop effects.
    if (isInactiveVariant(anchor.current)) return;

    // The rule key this decision resolved to, captured so cleanup drops the same
    // entry it added. Rollouts have no rule, hence the flag-key fallback.
    let recordedKey: string | null = null;
    let active = true;

    const key = `${page}|${flagKey}`;
    const alreadyReported = reportedFor.has(key);

    void getOptimizelyBrowserClient().then((client) => {
      if (!active || !client) return;
      // Same attributes middleware used to pick the served variation (fxAttributes.ts).
      const ctx = client.createUserContext(userId, browserFxAttributes());
      // Fire the bucketing event for this flag only, and only the first time this page
      // reports it. On a repeat (a WX swap remount) the decision is still needed for
      // attribution, so decide with the event suppressed rather than skipping the call.
      const decision = alreadyReported
        ? ctx?.decide(flagKey, [OptimizelyDecideOption.DISABLE_DECISION_EVENT])
        : ctx?.decide(flagKey, []);
      if (!alreadyReported) reportedFor.add(key);

      // Report only what this visitor was actually served. The browser can bucket
      // differently than the server, and recording an unserved variation would tag
      // every later event with something the visitor never saw.
      if (!active || !decision?.enabled || !decision.variationKey) return;

      recordedKey = decision.ruleKey ?? decision.flagKey;
      recordVariation(recordedKey, decision.variationKey);
      if (alreadyReported) return;
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
  }, [flagKey, page]);

  // A zero-size anchor, so the effect can find which variant subtree it is in. Rendering
  // nothing would leave it with no position in the DOM to ask about.
  return <span ref={anchor} hidden aria-hidden="true" />;
}
