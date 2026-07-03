"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/tracking";

const PERSONAS = [
  { key: "",          label: "Default" },
  { key: "personal",  label: "Personal Banking" },
  { key: "business",  label: "Business Banking" },
];

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

export default function AudienceSwitcher() {
  const [current, setCurrent] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [bucketingId, setBucketingId] = useState("");
  const [userId, setUserId] = useState("anonymous");
  const [frequentCustomer, setFrequentCustomer] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const currentLabel = PERSONAS.find((p) => p.key === current)?.label ?? "Default";

  useEffect(() => {
    setCurrent(getCookie("demo_persona"));
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

  async function selectPersona(key: string) {
    if (key === current || loading) return;
    setLoading(true);
    setOpen(false);
    await fetch("/api/demo/set-persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: key }),
    });
    setCurrent(key);
    setLoading(false);
    trackEvent("mb_audience_switch", { from: current || "default", to: key || "default" });
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
    const res = await fetch("/api/demo/reset-visitor-id", { method: "POST" });
    const { userId: newId } = await res.json();
    setUserId(newId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div data-component="AudienceSwitcher" ref={ref} className="fixed bottom-16 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="bg-surface-lowest border border-outline-variant rounded-2xl shadow-xl overflow-hidden w-56">

          {/* Persona section */}
          <p className="px-4 pt-3 pb-2 text-xs font-mono text-on-surface-variant uppercase tracking-wider">
            Persona
          </p>
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              onClick={() => selectPersona(p.key)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                p.key === current
                  ? "text-brand font-semibold bg-brand/5"
                  : "text-on-surface hover:bg-surface-low"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  p.key === current ? "bg-brand" : "bg-outline-variant"
                }`}
              />
              {p.label}
            </button>
          ))}

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
              <span className={`text-xs font-mono truncate text-right ${bucketingId ? "text-emerald-600" : "text-on-surface-variant"}`}>{bucketingId ? `${bucketingId.slice(0, 8)}…` : "—"}</span>
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
