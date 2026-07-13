"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export interface ServedMetadata {
  key?: string | null;
  version?: string | number | null;
  status?: string | null;
  locale?: string | null;
  variation?: string | null;
}

interface Props {
  params: Record<string, string>;
  served: ServedMetadata | null;
  serverRenderedAt: string;
  diagnosticQuery: string;
  diagnosticResult: unknown;
  fetchError?: string;
}

const STORAGE_KEY = "preview-debug-overlay";

const switchListeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

// Persisted on/off switch so an editor who doesn't want the overlay never sees
// it again, and one who does keeps it across refreshes. Defaults to off.
// useSyncExternalStore keeps SSR (off) and client hydration in sync.
function useDebugEnabled(): [boolean, (v: boolean) => void] {
  const enabled = useSyncExternalStore(
    (cb) => {
      switchListeners.add(cb);
      window.addEventListener("storage", cb);
      return () => {
        switchListeners.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    readEnabled,
    () => false
  );
  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "on" : "off");
    } catch {
      /* storage unavailable */
    }
    switchListeners.forEach((l) => l());
  };
  return [enabled, set];
}

// Initial value is derived from `iso` (deterministic across SSR/hydration ->
// starts at 0s), then the interval advances it. A fresh `iso` after a
// router.refresh naturally pulls the counter back toward 0.
function useSecondsSince(iso: string): number {
  const [now, setNow] = useState(() => new Date(iso).getTime());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-white/20"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function Section({
  label,
  copyText,
  children,
}: {
  label: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 py-1.5 text-left text-[11px] font-medium text-white/80 hover:text-white"
        >
          <span className="mr-1 inline-block w-3">{open ? "▾" : "▸"}</span>
          {label}
        </button>
        {open && copyText ? <CopyButton text={copyText} /> : null}
      </div>
      {open ? (
        <pre className="mb-2 max-h-64 overflow-auto rounded bg-black/40 p-2 text-[10px] leading-relaxed text-white/80">
          {children}
        </pre>
      ) : null}
    </div>
  );
}

export default function PreviewDebugOverlay({
  params,
  served,
  serverRenderedAt,
  diagnosticQuery,
  diagnosticResult,
  fetchError,
}: Props) {
  const [enabled, setEnabled] = useDebugEnabled();
  const [collapsed, setCollapsed] = useState(true);
  const seconds = useSecondsSince(serverRenderedAt);
  const renderedClock = new Date(serverRenderedAt).toLocaleTimeString();

  const requestedVer = params.ver;
  const servedVer = served?.version != null ? String(served.version) : null;
  const mismatch = Boolean(requestedVer && servedVer && requestedVer !== servedVer);

  const resultText = JSON.stringify(diagnosticResult, null, 2);

  // Master switch off: show only a tiny, unobtrusive toggle so editors aren't
  // hindered. Preference is persisted per browser.
  if (!enabled) {
    return (
      <button
        data-component="PreviewDebugOverlay"
        type="button"
        onClick={() => setEnabled(true)}
        title="Show preview debug overlay"
        aria-label="Show preview debug overlay"
        className="fixed bottom-3 right-3 z-[9999] flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[11px] text-white/70 opacity-40 shadow hover:opacity-100"
      >
        🐞
      </button>
    );
  }

  if (collapsed) {
    return (
      <div
        data-component="PreviewDebugOverlay"
        className={`fixed bottom-3 right-3 z-[9999] flex items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 font-mono text-[11px] text-white shadow-lg backdrop-blur ${
          mismatch || fetchError ? "bg-red-600/90" : "bg-black/80"
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
          preview {servedVer ? `v${servedVer}` : "?"} · {seconds}s
        </button>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          title="Hide debug overlay"
          aria-label="Hide debug overlay"
          className="rounded px-1 text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      data-component="PreviewDebugOverlay"
      className="fixed bottom-3 right-3 z-[9999] w-80 max-w-[calc(100vw-1.5rem)] rounded-xl bg-black/85 font-mono text-white shadow-2xl backdrop-blur"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
          Preview debug
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded px-1.5 text-white/60 hover:text-white"
            title="Collapse to pill"
            aria-label="Collapse preview debug overlay"
          >
            –
          </button>
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className="rounded px-1.5 text-white/60 hover:text-white"
            title="Hide overlay"
            aria-label="Hide preview debug overlay"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="px-3 pb-2">
        {fetchError ? (
          <div className="mb-2 rounded bg-red-600/90 px-2 py-1.5 text-[11px]">
            ⚠ Content fetch failed: {fetchError}
          </div>
        ) : mismatch ? (
          <div className="mb-2 rounded bg-red-600/90 px-2 py-1.5 text-[11px] leading-snug">
            ⚠ Requested v{requestedVer} · Graph served v{servedVer} — Graph likely
            hasn&apos;t indexed the new version yet. Wait ~30-60s and refresh.
          </div>
        ) : servedVer ? (
          <div className="mb-2 rounded bg-green-600/80 px-2 py-1.5 text-[11px]">
            ✓ Serving v{servedVer}
          </div>
        ) : null}

        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-white/80">
          <dt className="text-white/50">key</dt>
          <dd className="truncate">{served?.key ?? params.key ?? "—"}</dd>
          <dt className="text-white/50">requested</dt>
          <dd>v{requestedVer ?? "—"}</dd>
          <dt className="text-white/50">served</dt>
          <dd>v{servedVer ?? "—"}</dd>
          <dt className="text-white/50">status</dt>
          <dd>{served?.status ?? "—"}</dd>
          <dt className="text-white/50">locale</dt>
          <dd>{served?.locale ?? params.loc ?? "—"}</dd>
          <dt className="text-white/50">variation</dt>
          <dd>{served?.variation ?? "—"}</dd>
          <dt className="text-white/50">rendered</dt>
          <dd>
            {seconds}s ago ({renderedClock})
          </dd>
        </dl>
      </div>

      <Section label="params" copyText={JSON.stringify(params, null, 2)}>
        {JSON.stringify(params, null, 2)}
      </Section>
      <Section label="diagnostic query" copyText={diagnosticQuery}>
        {diagnosticQuery}
      </Section>
      <Section label="graph response" copyText={resultText}>
        {resultText}
      </Section>
    </div>
  );
}
