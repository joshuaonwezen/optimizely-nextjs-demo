"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useVisitorProfile } from "@/lib/optimizely/useVisitorProfile";
import { getActiveVariations } from "@/lib/tracking/activeVariations";

// Hands Web Experimentation the same visitor profile everything else reads.
//
// WX already shares the optimizelyEndUserId cookie with FX (visitorCookie.ts writes
// it at registrable-domain scope), and a WX decision now drives CMS variations through
// wxVariation.ts + WxVariationSwap. What it could not do is see anything about the
// visitor: persona, ODP segments, the categories they read. So a marketer building a WX
// audience on a CMS taxonomy term or an ODP segment needed a developer. After this they
// do not.
//
// Timing, and it is worth being honest about on the demo page: the WX snippet is a
// blocking <script> in <head>, so window.optimizely exists well before this runs, but
// WX evaluates audiences at page-activation time and this push lands after hydration.
// The attributes therefore apply to the NEXT activation.
//
// That lag is specific to THIS component and is not shared by the variation bridge,
// which reads a decision WX has already made rather than trying to influence the one
// it is about to make. WxVariationSwap's activate push on navigation does partially
// mitigate it on soft navs, but a first-load audience built on these attributes still
// takes effect one activation late.

// Before the snippet loads, window.optimizely is a plain bootstrap array. Once it
// initialises, the snippet REPLACES it with its own object that exposes push(). So
// Array.isArray() is false on a page where WX is actually working - detect the push
// method instead. (Measured: the gate silently never fired with the isArray check.)
declare global {
  interface Window {
    optimizely?: { push: (event: unknown) => void } | unknown[];
  }
}

function wxPush(): ((event: unknown) => void) | null {
  const wx = window.optimizely;
  return wx && typeof (wx as { push?: unknown }).push === "function"
    ? ((wx as { push: (event: unknown) => void }).push.bind(wx) as (event: unknown) => void)
    : null;
}

export default function WxProfileBridge() {
  // This mounts in the root layout, so an unconditional profile fetch would add an
  // /api/profile round trip to every page load site-wide. Only pay it where WX is
  // actually loaded and can use the attributes.
  // The snippet is a blocking <script> in <head>, so this is already settled by the
  // time React hydrates and never changes afterwards - hence the no-op subscribe.
  // useSyncExternalStore rather than an effect, so nothing calls setState on mount.
  const wxLoaded = useSyncExternalStore(
    () => () => {},
    () => wxPush() !== null,
    () => false,
  );

  const { profile } = useVisitorProfile({ enabled: wxLoaded });

  useEffect(() => {
    if (!profile) return;

    const variations = getActiveVariations();
    const attributes: Record<string, string> = {
      persona: profile.persona,
      logged_in: String(profile.loggedIn),
      device: profile.device,
    };
    // Only send what we actually know. An empty string would read as a real value in
    // the WX audience builder and quietly match visitors we know nothing about.
    if (profile.odpSegments.length > 0) attributes.odp_segment = profile.odpSegments[0];
    if (profile.readCategories.length > 0) attributes.top_category = profile.readCategories[0];
    const activeRules = Object.keys(variations);
    if (activeRules.length > 0) {
      attributes.fx_variation = `${activeRules[0]}-${variations[activeRules[0]]}`;
    }

    try {
      wxPush()?.({ type: "user", attributes });
    } catch {
      // WX blocked or not loaded: personalization elsewhere must not be affected.
    }
  }, [profile]);

  return null;
}
