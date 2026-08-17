"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/tracking";
import { clearSegment, PERSONA_LABELS, useCurrentSegment, writeSegment, type Persona } from "@/lib/segment";

// Segment options mirror the personas the homepage can serve. new_visitor is the
// default (no persona / base experience, before any section has been browsed).
const SEGMENT_ORDER: Persona[] = ["new_visitor", "personal", "business", "mortgages", "investments"];

const DEMO_ACCOUNT = "demo-account@mosey.bank";

async function hashEmail(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getCookie(name: string): string {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

// One live ODP audience the visitor qualifies for. Mapped audiences (those in
// ODP_SEGMENT_TO_VARIATION) drive a homepage variation and are highlighted.
function AudienceRow({ name, mapped }: { name: string; mapped: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-1.5 w-1.5 shrink-0 rounded-full ${mapped ? "bg-brand" : "bg-outline-variant"}`} />
      <span className={`text-xs font-mono truncate ${mapped ? "text-on-surface" : "text-on-surface-variant"}`}>{name}</span>
      {mapped && <span className="text-xs text-brand shrink-0">mapped</span>}
    </div>
  );
}

export default function AudienceSwitcher() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [bucketingId, setBucketingId] = useState("");
  const [userId, setUserId] = useState("anonymous");
  const [frequentCustomer, setFrequentCustomer] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [odp, setOdp] = useState<{ segments: string[]; mapped: string[]; variation: string | null } | null>(null);
  const [odpLoading, setOdpLoading] = useState(false);
  const [odpExpanded, setOdpExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Live browsing-derived segment (updates on every navigation via AutoTracker).
  const segment = useCurrentSegment();

  const currentLabel = PERSONA_LABELS[segment];

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

  useEffect(() => {
    const bid = getCookie("demo_bucketing_id");
    setBucketingId(bid);
    setLoggedIn(!!bid);
    setUserId(getCookie("optimizelyEndUserId") || "anonymous");
    setFrequentCustomer(!!getCookie("demo_page_views"));

    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
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

  return (
    <div data-component="AudienceSwitcher" ref={ref} className="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-xl overflow-hidden w-56">

          {/* Segment - reflects the section last browsed; click any to override */}
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
            Segment
          </p>
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
          <p className="px-4 pt-1 pb-2 text-xs font-mono text-on-surface-variant">
            auto from browsing · click to override
          </p>

          {/* Live ODP membership - the real server-side qualification (queried by fs_user_id)
              that actually drives the homepage variation, shown to verify the ODP path. */}
          <div className="px-4 pt-3 pb-3 border-t border-outline-variant mt-1">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                ODP membership · live
              </p>
              <button
                onClick={loadOdpMembership}
                disabled={odpLoading}
                title="Re-query ODP for this visitor"
                className="text-xs text-brand hover:underline disabled:opacity-60"
              >
                {odpLoading ? "checking…" : "refresh"}
              </button>
            </div>
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
                      className="w-full flex items-center justify-between text-xs font-mono text-on-surface"
                    >
                      <span>{odp.segments.length} audiences qualified</span>
                      <span className={`text-on-surface-variant transition-transform ${odpExpanded ? "rotate-180" : ""}`}>▾</span>
                    </button>
                    {odpExpanded && (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pt-0.5">
                        {odp.segments.map((name) => (
                          <AudienceRow key={name} name={name} mapped={odp.mapped.includes(name)} />
                        ))}
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs font-mono text-on-surface-variant pt-0.5">
                  variation → {odp.variation ?? "(none — no mapped audience)"}
                </p>
              </div>
            ) : (
              <p className="text-xs font-mono text-on-surface-variant">
                not qualified for any ODP audience
              </p>
            )}
          </div>

          {/* Attributes section */}
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider border-t border-outline-variant mt-1">
            Attributes
          </p>
          <div className="px-4 pb-3">
            <button
              onClick={toggleFrequentCustomer}
              className="w-full flex items-center justify-between py-1.5 text-sm text-on-surface"
            >
              <span>Frequent Customer</span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                  frequentCustomer ? "bg-brand" : "bg-outline-variant"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                    frequentCustomer ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
            {frequentCustomer && (
              <p className="text-xs font-mono text-on-surface-variant mt-1">page_views = 5</p>
            )}
          </div>

          {/* Auth + Login section */}
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider border-t border-outline-variant mt-1">
            Auth State
          </p>
          <div className="px-4 pb-3 flex gap-2">
            {[{ value: false, label: "Guest" }, { value: true, label: "Logged In" }].map(({ value, label }) => (
              <button
                key={String(value)}
                onClick={() => selectAuth(value)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  loggedIn === value
                    ? "bg-brand text-on-brand"
                    : "bg-surface-low text-on-surface hover:bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-outline-variant space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-mono text-on-surface-variant shrink-0">visitor_id</span>
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="text-xs font-mono text-on-surface truncate text-right">{userId === "anonymous" ? "anonymous" : `${userId.slice(0, 8)}…${userId.slice(-4)}`}</span>
                <button
                  onClick={resetVisitorId}
                  disabled={loading}
                  title="Reset visitor ID — assigns a fresh UUID and re-buckets you"
                  className="text-xs text-brand hover:underline disabled:opacity-60 shrink-0"
                >
                  reset
                </button>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-mono text-on-surface-variant shrink-0">bucketing_id</span>
              <span className={`text-xs font-mono truncate text-right ${bucketingId ? "text-brand" : "text-on-surface-variant"}`}>{bucketingId ? `${bucketingId.slice(0, 8)}…` : "—"}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 bg-surface-lowest border border-outline-variant rounded-full pl-3 pr-4 py-2 shadow-lg hover:shadow-xl transition-all text-sm font-medium text-on-surface disabled:opacity-60"
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
        <span className="text-on-surface-variant text-xs">Audience</span>
        <span>{loading ? "Switching…" : currentLabel}</span>
        {loggedIn && (
          <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono">auth</span>
        )}
        {frequentCustomer && (
          <span className="text-xs bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono">freq</span>
        )}
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
