"use client";

import { startTransition, useEffect } from "react";
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
// with no change to the Graph query. The address bar is then put back to the clean
// path, so the segment is an implementation detail rather than something visitors see.
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
//
// IMPORTANT: assume this component REMOUNTS across the swap. The pre-paint script and
// the region wrapper are only rendered on a clean path, so the sibling structure
// changes and React may discard the instance. Nothing here may depend on state
// surviving the navigation - hence the latch on the global rather than a ref, the URL
// restore running on the variation render rather than from a settle effect, and the
// reconciled attribution below rather than a record-on-mount / clear-on-unmount pair.

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

// What we last reported to the shared variation map. Module scope, so it survives the
// remount and a later navigation can still retract it. Without this, the old
// instance's unmount would clear the entry the swap had just recorded, and GA4 events
// would lose exp_variant_string.
let reported: string | null = null;

function reportVariation(rule: string | null, variation: string | null) {
  if (reported && reported !== rule) {
    clearVariation(reported);
    reported = null;
  }
  if (rule && variation && reported !== rule) {
    recordVariation(rule, variation);
    reported = rule;
  }
}

// Puts the clean path back in the address bar once the variation is on screen.
// usePathname() follows a manual replaceState, so the effect below re-runs with the
// clean path; the doneFor latch is what stops that from starting another swap.
function restoreCleanUrl(clean: string) {
  try {
    if (!window.location.pathname.includes("/__v_")) return;
    window.history.replaceState(
      null,
      "",
      clean + window.location.search + window.location.hash
    );
  } catch {
    // Leave the URL as it is. The variation is already rendered, and a visible
    // segment is cosmetic next to breaking the page.
  }
}

export default function WxVariationSwap({ variations }: { variations: string[] }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    ensureReader();
    const state = globalState();

    // A variation is on screen: either our swap landed, or this URL was requested
    // directly, or FX decided. Release the hold, and if it was our swap, re-assert
    // attribution (the remount may have retracted it) and hide the segment again.
    if (pathname.includes("/__v_")) {
      clearHold();
      const clean = state?.doneFor;
      if (clean && clean !== pathname) {
        reportVariation(state?.e ?? "wx", state?.v ?? null);
        restoreCleanUrl(clean);
      }
      return;
    }

    if (!state) {
      clearHold();
      return;
    }

    // Already swapped this page and the URL has been cleaned: the variation is on
    // screen even though the path looks untouched. Re-running the read here is what
    // would otherwise swap forever.
    if (state.doneFor === pathname) {
      clearHold();
      reportVariation(state.e ?? "wx", state.v ?? null);
      return;
    }

    // A clean path with no swap of ours: drop any variation carried over from the
    // previous page so it stops tagging events here.
    reportVariation(null, null);

    // The allowlist is per page, so refresh it before any read - on a soft nav the
    // global still carries the previous page's names.
    state.names = variations;

    const go = (name: string, experiment: string | null) => {
      if (state.doneFor === pathname) return;
      state.doneFor = pathname;
      state.v = name;
      state.e = experiment;
      reportVariation(experiment ?? "wx", name);
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: "optimizely_decision",
        optimizely_source: "web_experimentation",
        optimizely_rule: experiment ?? "wx",
        optimizely_variation: name,
      });
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

  return null;
}
