"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyBrowserClient } from "./browser-client";

export interface ClientFxDecision {
  enabled: boolean;
  variationKey: string | null;
  variables: Record<string, unknown>;
}

function getCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

// Resolves an FX flag in the browser using the same attributes as the server-side
// getVisitorContext (device, logged_in, persona, page_views). Returns null until the
// datafile loads. Impression-suppressed - render <FxBucketingEvent> to fire the event
// when the variant is shown, matching the existing measurement behavior.
//
// Decisions are suppressed on /demo/* routes (returns null), so the SDK documentation
// pages render flag-free chrome - no banner, sticky offer, rates bar, etc. This mirrors
// the middleware, which also skips server-side FX bucketing on /demo (src/middleware.ts).
export function useFxDecision(flagKey: string): ClientFxDecision | null {
  const pathname = usePathname();
  const [decision, setDecision] = useState<ClientFxDecision | null>(null);

  useEffect(() => {
    // No flag-driven global UI on the docs pages. Clear any prior decision so
    // client-side navigation into /demo hides UI that was showing on the last page.
    if (pathname && /^\/demo(\/|$)/.test(pathname)) {
      setDecision(null);
      return;
    }

    let cancelled = false;
    const userId = getCookie("optimizelyEndUserId");
    if (!userId) return;

    void getOptimizelyBrowserClient().then((client) => {
      if (!client || cancelled) return;
      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const demoPersona = getCookie("demo_persona");
      const bucketingId = getCookie("demo_bucketing_id");
      const demoPageViews = getCookie("demo_page_views");

      const ctx = client.createUserContext(userId, {
        device,
        hostname: window.location.hostname,
        logged_in: !!bucketingId,
        ...(demoPersona ? { persona: demoPersona } : {}),
        ...(demoPageViews !== undefined ? { page_views: Number(demoPageViews) } : {}),
      });
      if (!ctx) return;

      // Enable in the browser with: localStorage.setItem("fx_debug","1") — or ?fxdebug in the URL.
      const debug =
        typeof window !== "undefined" &&
        (localStorage.getItem("fx_debug") === "1" || window.location.search.includes("fxdebug"));
      const d = ctx.decide(
        flagKey,
        debug
          ? [OptimizelyDecideOption.DISABLE_DECISION_EVENT, OptimizelyDecideOption.INCLUDE_REASONS]
          : [OptimizelyDecideOption.DISABLE_DECISION_EVENT]
      );
      if (debug) {
        console.warn(
          `[fx] flag=${flagKey} hostname=${JSON.stringify(window.location.hostname)} ` +
            `enabled=${d.enabled} variation=${d.variationKey}`,
          { reasons: d.reasons }
        );
      }
      if (cancelled) return;
      setDecision({
        enabled: d.enabled,
        variationKey: d.variationKey,
        variables: d.variables as Record<string, unknown>,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [flagKey, pathname]);

  return decision;
}
