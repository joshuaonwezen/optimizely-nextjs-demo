"use client";

import { useEffect, useRef, useState } from "react";
import CopyButton from "@/components/ui/CopyButton";

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

// Preview diagnostics. Rendered inline in the preview toolbar (top of the page):
// a compact pill that opens a dark detail panel. Not a floating overlay - the CMS
// preview iframe strands fixed/sticky elements at the bottom of the document.
export default function PreviewDebugOverlay({
  params,
  served,
  serverRenderedAt,
  diagnosticQuery,
  diagnosticResult,
  fetchError,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const seconds = useSecondsSince(serverRenderedAt);
  const renderedClock = new Date(serverRenderedAt).toLocaleTimeString();

  const requestedVer = params.ver;
  const servedVer = served?.version != null ? String(served.version) : null;
  const mismatch = Boolean(requestedVer && servedVer && requestedVer !== servedVer);
  const alert = Boolean(mismatch || fetchError);
  const resultText = JSON.stringify(diagnosticResult, null, 2);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div data-component="PreviewDebugOverlay" ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Preview diagnostics"
        className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-3 text-sm font-medium shadow-sm transition-shadow hover:shadow ${
          alert
            ? "border-error/40 bg-error/10 text-error"
            : "border-outline-variant bg-surface-lowest text-on-surface"
        }`}
      >
        <span className={`inline-block h-2 w-2 rounded-full ${alert ? "bg-error" : "bg-brand"}`} />
        <span className="font-mono text-xs">
          {servedVer ? `v${servedVer}` : "preview"} · {seconds}s
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`h-3.5 w-3.5 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[2147483647] mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-black/90 font-mono text-white shadow-2xl">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Preview debug
          </div>

          <div className="px-3 pb-2">
            {fetchError ? (
              <div className="mb-2 rounded bg-red-600/90 px-2 py-1.5 text-[11px]">
                ⚠ Content fetch failed: {fetchError}
              </div>
            ) : mismatch ? (
              <div className="mb-2 rounded bg-red-600/90 px-2 py-1.5 text-[11px] leading-snug">
                ⚠ Requested v{requestedVer} · Graph served v{servedVer} - Graph likely
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
      )}
    </div>
  );
}
