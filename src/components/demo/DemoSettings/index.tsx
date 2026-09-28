"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/tracking";
import { clearSegment, PERSONA_LABELS, useCurrentSegment, writeSegment, type Persona } from "@/lib/segment";
import { readCookie } from "@/lib/tracking/cookies";
import { DEMO_BUCKETING_ID_COOKIE, DEMO_PAGE_VIEWS_COOKIE, VISITOR_ID_COOKIE } from "@/lib/optimizely/cookieNames";
import {
  readWxMode,
  WX_GLOBAL,
  WX_MODE_KEY,
  WX_MODE_PREPAINT,
  WX_MODE_SOFTNAV,
  type WxMode,
} from "@/lib/optimizely/wxVariation";
import { AudienceRow, IdRow, SegmentedButtons, SettingsSection, Toggle } from "./panelSections";

// Segment options mirror the personas the homepage can serve. new_visitor is the
// default (no persona / base experience, before any section has been browsed).
const SEGMENT_ORDER: Persona[] = ["new_visitor", "personal", "business", "mortgages", "investments"];

const DEMO_ACCOUNT = "demo-account@mosey.bank";

// The panel outgrew a single column once ODP membership and WX delivery landed in
// it, so the sections are split across tabs. Each tab is its own scroll area, which
// is what keeps the panel inside the viewport as more controls get added.
const TABS = [
  { id: "audience", label: "Audience" },
  { id: "delivery", label: "Delivery" },
  { id: "identity", label: "Identity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const WX_MODE_OPTIONS = [
  { value: WX_MODE_SOFTNAV, label: "Soft nav" },
  { value: WX_MODE_PREPAINT, label: "Pre-paint" },
] as const;

const AUTH_OPTIONS = [
  { value: false, label: "Guest" },
  { value: true, label: "Logged In" },
] as const;

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function DemoSettings() {
  const [wxMode, setWxMode] = useState<WxMode>(WX_MODE_SOFTNAV);
  const [wxActive, setWxActive] = useState<{ v: string | null; e: string | null } | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [bucketingId, setBucketingId] = useState("");
  const [userId, setUserId] = useState("anonymous");
  const [frequentCustomer, setFrequentCustomer] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("audience");
  const [loading, setLoading] = useState(false);
  const [odp, setOdp] = useState<{ segments: string[]; mapped: string[]; variation: string | null } | null>(null);
  const [odpLoading, setOdpLoading] = useState(false);
  const [odpExpanded, setOdpExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Live browsing-derived segment (updates on every navigation via AutoTracker).
  const segment = useCurrentSegment();

  const currentLabel = PERSONA_LABELS[segment];

  // Anything the Identity tab would show as "on", surfaced as a dot on the tab so
  // the trigger pill no longer has to carry an auth/freq badge for each one.
  const identityActive = loggedIn || frequentCustomer;

  // Live ODP membership for this visitor - the real server-side qualification that drives
  // the homepage variation (queried by fs_user_id), independent of the demo_persona override
  // above. Refetched each time the panel opens so it reflects the current visitor_id.
  async function loadOdpMembership() {
    setOdpLoading(true);
    setOdpExpanded(false);
    try {
      const res = await fetch("/api/demo/odp-segments", { cache: "no-store" });
      const data = await res.json();
      setOdp({
        segments: data.qualifiedSegments ?? [],
        mapped: data.mappedSegments ?? [],
        variation: data.resolvedVariation ?? null,
      });
    } catch {
      setOdp({ segments: [], mapped: [], variation: null });
    } finally {
      setOdpLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadOdpMembership();
  }, [open]);

  // Below md the panel is a docked sheet rather than a popover, so the page behind it
  // must not scroll with it. Matching the breakpoint in JS keeps the desktop popover
  // from locking the page it is anchored to.
  useEffect(() => {
    if (!open) return;
    const isSheet = window.matchMedia("(max-width: 767px)").matches;
    if (!isSheet) return;
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = "";
    };
  }, [open]);

  useEffect(() => {
    const bid = readCookie(DEMO_BUCKETING_ID_COOKIE);
    setBucketingId(bid);
    setLoggedIn(!!bid);
    setUserId(readCookie(VISITOR_ID_COOKIE) || "anonymous");
    setFrequentCustomer(!!readCookie(DEMO_PAGE_VIEWS_COOKIE));
    setWxMode(readWxMode());
    // What the WX bridge actually resolved on this page, so a presenter can see which
    // mechanism produced what is on screen. Null on any page with no wx_ variation.
    const wx = (window as unknown as Record<string, { v?: string | null; e?: string | null } | undefined>)[WX_GLOBAL];
    setWxActive(wx ? { v: wx.v ?? null, e: wx.e ?? null } : null);

    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Manual override of the live segment. Writes the same sessionStorage + session
  // cookie the browsing signal uses (writeSegment), or clears it for new_visitor,
  // then refreshes so the server re-renders the homepage variation. Browsing a
  // section afterwards will overwrite this choice.
  function selectSegment(key: Persona) {
    if (key === segment || loading) return;
    const from = segment;
    setOpen(false);
    if (key === "new_visitor") clearSegment();
    else writeSegment(key);
    trackEvent("mb_audience_switch", { from, to: key });
    router.refresh();
  }

  async function toggleFrequentCustomer() {
    if (loading) return;
    setLoading(true);
    const next = !frequentCustomer;
    await fetch("/api/demo/set-attributes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageViews: next ? 5 : null }),
    });
    setFrequentCustomer(next);
    setLoading(false);
    router.refresh();
  }

  async function selectAuth(value: boolean) {
    if (value === loggedIn || loading) return;
    setLoading(true);
    const hashedId = value ? await hashEmail(DEMO_ACCOUNT) : null;
    await fetch("/api/demo/set-bucketing-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucketingId: hashedId }),
    });
    setLoggedIn(value);
    setBucketingId(hashedId ?? "");
    setLoading(false);
    router.refresh();
  }

  // Switches which mechanism delivers a WX-decided CMS variation. localStorage rather
  // than a cookie because the choice has to be readable by the inline pre-paint script,
  // and because a cookie could not change a statically prerendered page anyway. Reloads
  // for the same reason resetVisitorId does: the decision is made during page load, so
  // router.refresh() would leave the old mechanism in place.
  function selectWxMode(next: WxMode) {
    if (next === wxMode) return;
    try {
      window.localStorage.setItem(WX_MODE_KEY, next);
    } catch {
      // Blocked storage: the mode cannot be persisted, so leave it on the default.
      return;
    }
    setWxMode(next);
    trackEvent("mb_wx_mode_switch", { mode: next });
    window.location.reload();
  }

  async function resetVisitorId() {
    if (loading) return;
    setLoading(true);
    await fetch("/api/demo/reset-visitor-id", { method: "POST" });
    // Full reload, not router.refresh(): client-side flag hooks (useFxDecision)
    // read the visitor ID inside a [flagKey, pathname] effect that router.refresh()
    // does not re-run, so they'd keep the old bucket. Reloading remounts them so
    // they re-decide with the new ID and actually re-bucket.
    window.location.reload();
  }

  // Roving focus across the tab strip, per the tabs pattern.
  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next].id);
    document.getElementById(`demo-settings-tab-${TABS[next].id}`)?.focus();
  }

  return (
    <div data-component="DemoSettings" ref={ref} className="fixed bottom-16 right-6 z-50 md:flex md:flex-col md:items-end">
      {open && (
        <>
          {/* Dimmer for the mobile sheet. It lives inside the ref wrapper, so the
              outside-click listener never sees it - it closes on its own click. */}
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="md:hidden fixed inset-0 z-40 bg-black/20"
          />

          {/* Mobile: a sheet docked above the trigger pill, which itself clears the
              bottom tab bar. Desktop: back in flow as a popover above the pill. */}
          <div
            role="dialog"
            aria-label="Demo settings"
            className="fixed inset-x-0 bottom-28 z-50 flex max-h-[75dvh] flex-col overflow-hidden rounded-t-2xl border-t border-outline-variant bg-surface-lowest shadow-xl md:static md:mb-2 md:max-h-[calc(100dvh-8rem)] md:w-[340px] md:rounded-2xl md:border"
          >
            {/* Grabber - a sheet affordance, so it is mobile-only. */}
            <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
              <span className="h-1 w-9 rounded-full bg-outline-variant" />
            </div>

            <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-3 pb-2">
              <p className="text-sm font-semibold text-on-surface">Settings</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="p-1 -mr-1 rounded-lg text-on-surface-variant hover:bg-surface-low transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div role="tablist" aria-label="Settings sections" className="shrink-0 flex border-b border-outline-variant px-2">
              {TABS.map((t, index) => {
                const selected = t.id === tab;
                return (
                  <button
                    key={t.id}
                    id={`demo-settings-tab-${t.id}`}
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`demo-settings-panel-${t.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(t.id)}
                    onKeyDown={(e) => onTabKeyDown(e, index)}
                    className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-sm font-medium transition-colors ${
                      selected ? "text-brand" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {t.label}
                    {t.id === "identity" && identityActive && (
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
                    )}
                    {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
                  </button>
                );
              })}
            </div>

            <div
              id={`demo-settings-panel-${tab}`}
              role="tabpanel"
              aria-labelledby={`demo-settings-tab-${tab}`}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-outline-variant"
            >
              {tab === "audience" && (
                <>
                  {/* Segment - reflects the section last browsed; click any to override */}
                  <SettingsSection title="Segment">
                    <div className="-mx-4">
                      {SEGMENT_ORDER.map((key) => {
                        const active = key === segment;
                        return (
                          <button
                            key={key}
                            onClick={() => selectSegment(key)}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                              active
                                ? "text-brand font-semibold bg-brand/5"
                                : "text-on-surface hover:bg-surface-low"
                            }`}
                          >
                            <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                              {active && (
                                <span className="absolute inline-flex h-full w-full rounded-full bg-brand/60 animate-ping" />
                              )}
                              <span
                                className={`relative inline-flex h-2 w-2 rounded-full ${
                                  active ? "bg-brand" : "bg-outline-variant"
                                }`}
                              />
                            </span>
                            {PERSONA_LABELS[key]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="pt-2 text-xs font-mono text-on-surface-variant">
                      auto from browsing · click to override
                    </p>
                  </SettingsSection>

                  {/* Live ODP membership - the real server-side qualification (queried by fs_user_id)
                      that actually drives the homepage variation, shown to verify the ODP path. */}
                  <SettingsSection
                    title="ODP membership · live"
                    action={
                      <button
                        onClick={loadOdpMembership}
                        disabled={odpLoading}
                        title="Re-query ODP for this visitor"
                        className="text-xs text-brand hover:underline disabled:opacity-60 shrink-0"
                      >
                        {odpLoading ? "checking…" : "refresh"}
                      </button>
                    }
                  >
                    {odpLoading && !odp ? (
                      <p className="text-xs font-mono text-on-surface-variant">querying ODP…</p>
                    ) : odp && odp.segments.length > 0 ? (
                      <div className="space-y-1.5">
                        {/* One match: show it inline. Many: collapse behind a count so a large
                            account (100s of audiences) doesn't flood the widget. */}
                        {odp.segments.length === 1 ? (
                          <AudienceRow name={odp.segments[0]} mapped={odp.mapped.includes(odp.segments[0])} />
                        ) : (
                          <>
                            <button
                              onClick={() => setOdpExpanded((e) => !e)}
                              aria-expanded={odpExpanded}
                              className="w-full flex items-center justify-between text-xs font-mono text-on-surface"
                            >
                              <span>{odp.segments.length} audiences qualified</span>
                              <span className={`text-on-surface-variant transition-transform ${odpExpanded ? "rotate-180" : ""}`}>▾</span>
                            </button>
                            {odpExpanded && (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto overscroll-contain pt-0.5">
                                {odp.segments.map((name) => (
                                  <AudienceRow key={name} name={name} mapped={odp.mapped.includes(name)} />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        <p className="text-xs font-mono text-on-surface-variant pt-0.5">
                          variation → {odp.variation ?? "(none - no mapped audience)"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs font-mono text-on-surface-variant">
                        not qualified for any ODP audience
                      </p>
                    )}
                  </SettingsSection>
                </>
              )}

              {/* WX delivery - which mechanism applies a Web Experimentation decision to CMS
                  content. Both are real; they differ in whether the variation is in the first
                  paint. See /demo/web-experimentation. */}
              {tab === "delivery" && (
                <SettingsSection title="WX delivery">
                  <div className="space-y-2">
                    <SegmentedButtons options={WX_MODE_OPTIONS} value={wxMode} onSelect={selectWxMode} />
                    <p className="text-xs font-mono text-on-surface-variant">
                      {wxMode === WX_MODE_PREPAINT
                        ? "revealed before first paint · no request"
                        : "held, then one cached request"}
                    </p>
                    {wxActive ? (
                      <p className="text-xs font-mono text-on-surface-variant">
                        variation → {wxActive.v ?? "(no matching bucket)"}
                        {wxActive.e ? ` · ${wxActive.e}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs font-mono text-on-surface-variant">
                        no wx_ variation on this page
                      </p>
                    )}
                  </div>
                </SettingsSection>
              )}

              {tab === "identity" && (
                <>
                  <SettingsSection title="Attributes">
                    <Toggle
                      label="Frequent Customer"
                      checked={frequentCustomer}
                      onToggle={toggleFrequentCustomer}
                      disabled={loading}
                    />
                    {frequentCustomer && (
                      <p className="text-xs font-mono text-on-surface-variant mt-1">page_views = 5</p>
                    )}
                  </SettingsSection>

                  <SettingsSection title="Auth State">
                    <SegmentedButtons options={AUTH_OPTIONS} value={loggedIn} onSelect={selectAuth} disabled={loading} />
                  </SettingsSection>
                </>
              )}
            </div>

            {/* Pinned on every tab: the IDs a presenter checks constantly. */}
            <div className="shrink-0 px-4 py-3 border-t border-outline-variant space-y-1.5">
              <IdRow
                label="visitor_id"
                value={userId === "anonymous" ? "anonymous" : `${userId.slice(0, 8)}…${userId.slice(-4)}`}
                action={
                  <button
                    onClick={resetVisitorId}
                    disabled={loading}
                    title="Reset visitor ID - assigns a fresh UUID and re-buckets you"
                    className="text-xs text-brand hover:underline disabled:opacity-60 shrink-0"
                  >
                    reset
                  </button>
                }
              />
              <IdRow
                label="bucketing_id"
                value={bucketingId ? `${bucketingId.slice(0, 8)}…` : "—"}
                muted={!bucketingId}
              />
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex items-center gap-2 bg-surface-lowest border border-outline-variant rounded-full pl-3 pr-4 py-2 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-on-surface disabled:opacity-60"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-brand shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        <span className="hidden sm:inline text-on-surface-variant text-xs">Settings</span>
        <span className="truncate max-w-[9rem]">{loading ? "Switching…" : currentLabel}</span>
        {identityActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
