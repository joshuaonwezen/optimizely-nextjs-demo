"use client";

import { startTransition, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  readWxMode,
  WX_ACTIVE_ATTR,
  WX_EVENT,
  WX_GLOBAL,
  WX_MODE_PREPAINT,
  WX_PENDING_ATTR,
  WX_VARIANT_ATTR,
  WX_VARIANT_NAME_ATTR,
  WX_VARIANT_TOKEN,
  wxReaderScript,
  wxVariationPath,
  type WxCmsGlobal,
} from "@/lib/optimizely/wxVariation";
import { clearVariation, recordVariation } from "@/lib/tracking/activeVariations";

// Second half of the WX bridge. The inline pre-paint script (see
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
// It also has to handle client-side navigation. Two separate things break on a soft
// nav, and both are fixed here:
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

// Ask WX to re-evaluate for this URL. Harmless on a hard load (the snippet has already
// activated) and required after a client-side navigation, which WX does not notice.
function pushActivate() {
  try {
    const wx = window.optimizely as unknown as { push?: (e: unknown) => void } | undefined;
    if (typeof wx?.push === "function") wx.push({ type: "activate" });
  } catch {
    // WX blocked or not loaded: fall through to base content.
  }
}

// True when the server actually rendered a subtree for this variation name.
function revealable(name: string): boolean {
  const el = document.querySelector(`[${WX_VARIANT_ATTR}="${WX_VARIANT_TOKEN}"]`);
  return !!el && el.getAttribute(WX_VARIANT_NAME_ATTR) === name;
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

  // Nothing here may run during hydration. The server sends BOTH subtrees; the variation
  // route sends one. Acting from the mount effect let the replacement tree land while
  // React was still hydrating the two-subtree HTML, throwing "server rendered HTML didn't
  // match the client" on roughly half of first loads. A setTimeout was measured to be
  // insufficient.
  //
  // useSyncExternalStore is the signal: React takes the server snapshot (false) while
  // hydrating and the client snapshot (true) afterwards, re-rendering once when they
  // differ. Same shape as WxProfileBridge, and unlike a setState-in-effect it does not
  // trip react-hooks/set-state-in-effect. The subscribe is a no-op because this never
  // changes again after hydration.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!hydrated) return;
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

    state.names = variations;

    // Pre-paint mode. On a hard load the inline script has already revealed the variant and
    // this is only attribution. On a CLIENT-SIDE navigation neither of those happened: React
    // does not execute the inline script, and WX does not re-evaluate for the new URL, so
    // without the two calls below the page silently stays on base content. The reveal is
    // post-paint here by necessity - a client navigation has no blocking script.
    if (readWxMode() === WX_MODE_PREPAINT) {
      clearHold();
      pushActivate();
      const hit = state.v ? { v: state.v, e: state.e } : (state.read?.() ?? null);
      // Only reveal a variant the server actually sent. Setting the attribute when no
      // matching subtree exists would hide base and show nothing - the same trap the
      // inline script's DUAL guard covers.
      if (hit && revealable(hit.v)) {
        state.v = hit.v;
        state.e = hit.e;
        if (!document.documentElement.hasAttribute(WX_ACTIVE_ATTR)) {
          document.documentElement.setAttribute(WX_ACTIVE_ATTR, hit.v);
        }
        reportVariation(hit.e ?? "wx", hit.v);
        return;
      }
      // No variant on the page to reveal: fall through to the soft-nav path, which can
      // still fetch the variation route.
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

    pushActivate();

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
  }, [hydrated, pathname, router, variations]);

  return null;
}
