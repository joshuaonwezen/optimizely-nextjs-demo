"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  WX_EVENT,
  WX_GLOBAL,
  WX_PENDING_ATTR,
  wxReaderScript,
  wxVariationPath,
  type WxCmsGlobal,
} from "@/lib/optimizely/wxVariation";
import { clearVariation, recordVariation } from "@/lib/tracking/activeVariations";

// Second half of the cookieless WX bridge. The inline pre-paint script (see
// wxVariation.ts) has already read the WX decision synchronously and, on a match,
// hidden the held region. This component does the routing: a soft navigation to the
// __v_wx--<name> path, which is the same URL shape middleware builds for FX, so the
// catch-all's existing extractVariations/variationFilter path renders the variation
// with no change to the Graph query.
//
// Soft navigation rather than a reload: the RSC payload for that path is ISR-cached
// and shared by everyone in the bucket, so the swap is one cached fetch.
//
// It also has to handle client-side navigation, which the previous cookie bridge
// never did. Two separate things break on a soft nav, and both are fixed here:
//   1. React does not execute an inline <script> it inserts during a navigation, so
//      the pre-paint reader is not re-installed - hence the injection below.
//   2. WX itself does not re-evaluate on a History API navigation, so without an
//      explicit activate push it keeps reporting the decision for the page the
//      visitor originally landed on. Every internal link here is a next/link soft
//      nav, so without this the bridge would only ever work on the entry page.
// Neither can hold pre-paint (there is no blocking script in a client navigation),
// so on a soft nav the swap is a visible change rather than a held region.

// Indexed by the shared constant rather than a declared property name, so the
// accessor here can never drift from the name the inline script writes.
const globalState = (): WxCmsGlobal | undefined =>
  (window as unknown as Record<string, WxCmsGlobal | undefined>)[WX_GLOBAL];

function clearHold() {
  document.documentElement.removeAttribute(WX_PENDING_ATTR);
}

// Runs the one canonical reader. Injected as a real <script> element because that
// executes, where dangerouslySetInnerHTML during a navigation does not. Same source
// string the server inlines, so the holdback and match rules cannot drift.
function ensureReader() {
  if (typeof globalState()?.read === "function") return;
  const el = document.createElement("script");
  el.textContent = wxReaderScript();
  document.head.appendChild(el);
  el.remove();
}

export default function WxVariationSwap({ variations }: { variations: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    // Already on a variation path: either a direct hit, or the navigation below has
    // landed. Either way there is nothing left to decide, and re-reading the global
    // here is what would otherwise append a second __v_ segment forever.
    if (pathname.includes("/__v_")) {
      clearHold();
      return;
    }

    fired.current = false;
    ensureReader();

    const state = globalState();
    if (!state) {
      clearHold();
      return;
    }
    // The allowlist is per page, so refresh it before any read - on a soft nav the
    // global still carries the previous page's names.
    state.names = variations;

    const go = (name: string, experiment: string | null) => {
      if (fired.current) return;
      fired.current = true;
      recordVariation(experiment ?? "wx", name);
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: "optimizely_decision",
        optimizely_source: "web_experimentation",
        optimizely_rule: experiment ?? "wx",
        optimizely_variation: name,
      });
      setNavigating(true);
      startTransition(() => {
        router.replace(wxVariationPath(pathname, name), { scroll: false });
      });
    };

    // Ask WX to re-evaluate for this URL. Harmless on first load (the snippet has
    // already activated) and required after a soft nav.
    try {
      const wx = window.optimizely as unknown as { push?: (e: unknown) => void } | undefined;
      if (typeof wx?.push === "function") wx.push({ type: "activate" });
    } catch {
      // WX blocked or not loaded: fall through to base content.
    }

    const hit = state.read?.() ?? null;
    if (hit) {
      go(hit.v, hit.e);
      return;
    }

    // No decision yet. The region was never held (or the hold has its own timer), so
    // reveal now and wait for a late campaignDecided in case this page uses manual
    // activation or an audience that needed a network call.
    clearHold();
    const onLate = () => {
      const late = state.read?.() ?? null;
      if (late) go(late.v, late.e);
    };
    document.addEventListener(WX_EVENT, onLate);
    return () => document.removeEventListener(WX_EVENT, onLate);
  }, [pathname, router, variations]);

  // Release the hold once the variation render is committed. Also covers failure: if
  // the navigation errors the transition still settles, so the visitor gets base
  // content rather than a permanently hidden region. The inline script's timer is the
  // backstop for the case where this never runs at all.
  useEffect(() => {
    if (navigating && !isPending) clearHold();
  }, [navigating, isPending]);

  // Drop the attribution entry on unmount, so a variation served on one page stops
  // tagging events after a navigation. Mirrors FxBucketingEvent's cleanup.
  useEffect(() => {
    const state = globalState();
    return () => {
      const name = state?.e ?? "wx";
      if (state?.v) clearVariation(name);
    };
  }, []);

  return null;
}
