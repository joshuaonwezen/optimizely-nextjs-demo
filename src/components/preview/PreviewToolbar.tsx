"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/useIsClient";
import CopyButton from "@/components/ui/CopyButton";

export interface ServedMetadata {
  key?: string | null;
  version?: string | number | null;
  status?: string | null;
  locale?: string | null;
  variation?: string | null;
}

interface Props {
  /** Link pinned to the version currently being previewed. */
  pinnedUrl: string | null;
  /** Link that always resolves the newest version. */
  latestUrl: string | null;
  /** Version number of the pinned link, for labels. */
  version?: string | null;
  params: Record<string, string>;
  served: ServedMetadata | null;
  serverRenderedAt: string;
  diagnosticQuery: string;
  diagnosticResult: unknown;
  fetchError?: string;
}

type OpenPanel = "share" | "debug" | null;

function useSecondsSince(iso: string): number {
  const [now, setNow] = useState(() => new Date(iso).getTime());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  return Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
}

function Chevron({ open }: { open: boolean }) {
  return (
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
  );
}

function DebugSection({
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
    <div className="border-t border-outline-variant">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 py-1.5 text-left text-[11px] font-medium text-on-surface-variant hover:text-on-surface"
        >
          <span className="mr-1 inline-block w-3">{open ? "▾" : "▸"}</span>
          {label}
        </button>
        {open && copyText ? (
          <CopyButton
            text={copyText}
            className="rounded bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-on-surface-variant hover:bg-surface-low"
          />
        ) : null}
      </div>
      {open ? (
        <pre className="mb-2 max-h-64 overflow-auto rounded bg-surface-low p-2 text-[10px] leading-relaxed text-on-surface-variant">
          {children}
        </pre>
      ) : null}
    </div>
  );
}

// The /preview editorial toolbar. Portalled to a slot at the very top of <body>
// (above the site nav). Panels expand INSIDE the bar and push the page down -
// nothing floats over the content, and nothing is fixed/sticky (both are
// unreliable inside the CMS preview iframe).
export default function PreviewToolbar({
  pinnedUrl,
  latestUrl,
  version,
  params,
  served,
  serverRenderedAt,
  diagnosticQuery,
  diagnosticResult,
  fetchError,
}: Props) {
  const isClient = useIsClient();
  const [panel, setPanel] = useState<OpenPanel>(null);
  const [mode, setMode] = useState<"pinned" | "latest">(pinnedUrl ? "pinned" : "latest");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const seconds = useSecondsSince(serverRenderedAt);
  const renderedClock = new Date(serverRenderedAt).toLocaleTimeString();
  const requestedVer = params.ver;
  const servedVer = served?.version != null ? String(served.version) : null;
  const mismatch = Boolean(requestedVer && servedVer && requestedVer !== servedVer);
  const alert = Boolean(mismatch || fetchError);
  const resultText = JSON.stringify(diagnosticResult, null, 2);
  const canShare = Boolean(pinnedUrl || latestUrl);
  const activeUrl = (mode === "latest" ? latestUrl : pinnedUrl) ?? pinnedUrl ?? latestUrl ?? "";

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  if (!isClient) return null;
  const slot = document.getElementById("preview-topbar-slot");
  if (!slot) return null;

  const toggle = (p: Exclude<OpenPanel, null>) => setPanel((cur) => (cur === p ? null : p));

  async function copy() {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return createPortal(
    <div
      data-component="PreviewToolbar"
      className="border-b border-outline-variant bg-surface-lowest text-on-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-on-surface-variant">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${alert ? "bg-error" : "bg-brand"}`} />
          Editorial preview{servedVer ? ` · v${servedVer}` : ""}
        </span>

        <div className="flex items-center gap-2">
          {canShare && (
            <button
              type="button"
              onClick={() => toggle("share")}
              aria-expanded={panel === "share"}
              className="flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-lowest py-1.5 pl-2.5 pr-3 text-sm font-medium text-on-surface shadow-sm transition-shadow hover:shadow"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4 shrink-0 text-brand">
                <path
                  fillRule="evenodd"
                  d="M12.6 2.7a3.6 3.6 0 0 1 5.1 5.1l-2 2a1 1 0 0 1-1.5-1.4l2-2a1.6 1.6 0 1 0-2.3-2.3l-2 2a1 1 0 0 1-1.4-1.4l2-2Zm-3.3 4.4a1 1 0 0 1 0 1.4l-1.7 1.7a1 1 0 1 0 1.4 1.4l1.7-1.7a1 1 0 0 1 1.4 1.4l-1.7 1.7A3 3 0 0 1 6.2 8.8L7.9 7.1a1 1 0 0 1 1.4 0Zm3.8 1.4a1 1 0 0 1 1.4 0 3 3 0 0 1 0 4.2l-2.3 2.4a3 3 0 0 1-4.3-4.3 1 1 0 0 1 1.4 1.4 1 1 0 0 0 0 1.5 1 1 0 0 0 1.5 0l2.3-2.3a1 1 0 0 0 0-1.5 1 1 0 0 1 0-1.4Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Share link</span>
              <Chevron open={panel === "share"} />
            </button>
          )}

          <button
            type="button"
            onClick={() => toggle("debug")}
            aria-expanded={panel === "debug"}
            title="Preview diagnostics"
            className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-3 text-sm font-medium shadow-sm transition-shadow hover:shadow ${
              alert
                ? "border-error/40 bg-error/10 text-error"
                : "border-outline-variant bg-surface-lowest text-on-surface"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${alert ? "bg-error" : "bg-brand"}`} />
            <span className="font-mono text-xs">{servedVer ? `v${servedVer}` : "preview"} · {seconds}s</span>
            <Chevron open={panel === "debug"} />
          </button>
        </div>
      </div>

      {panel === "share" && canShare && (
        <div className="border-t border-outline-variant px-4 py-3">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <div className="flex gap-1.5">
              {([
                ["pinned", version ? `Version ${version}` : "This version", !pinnedUrl],
                ["latest", "Always latest", !latestUrl],
              ] as const).map(([m, label, disabled]) => (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                    mode === m
                      ? "bg-brand-fill text-on-brand"
                      : "bg-surface-low text-on-surface hover:bg-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              readOnly
              value={activeUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-outline-variant bg-surface-low px-2.5 py-2 text-xs font-mono text-on-surface-variant"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-brand-fill py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-fill-dim"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {panel === "debug" && (
        <div className="border-t border-outline-variant px-4 py-3 font-mono">
          <div className="mx-auto max-w-md">
            {fetchError ? (
              <div className="mb-2 rounded bg-error/10 px-2 py-1.5 text-[11px] text-error">
                ⚠ Content fetch failed: {fetchError}
              </div>
            ) : mismatch ? (
              <div className="mb-2 rounded bg-error/10 px-2 py-1.5 text-[11px] leading-snug text-error">
                ⚠ Requested v{requestedVer} · Graph served v{servedVer} - Graph likely hasn&apos;t
                indexed the new version yet. Wait ~30-60s and refresh.
              </div>
            ) : servedVer ? (
              <div className="mb-2 rounded bg-brand/10 px-2 py-1.5 text-[11px] text-brand">
                ✓ Serving v{servedVer}
              </div>
            ) : null}

            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-on-surface-variant">
              <dt className="text-on-surface-variant/70">key</dt>
              <dd className="truncate text-on-surface">{served?.key ?? params.key ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">requested</dt>
              <dd className="text-on-surface">v{requestedVer ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">served</dt>
              <dd className="text-on-surface">v{servedVer ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">status</dt>
              <dd className="text-on-surface">{served?.status ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">locale</dt>
              <dd className="text-on-surface">{served?.locale ?? params.loc ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">variation</dt>
              <dd className="text-on-surface">{served?.variation ?? "—"}</dd>
              <dt className="text-on-surface-variant/70">rendered</dt>
              <dd className="text-on-surface">
                {seconds}s ago ({renderedClock})
              </dd>
            </dl>

            <div className="mt-2">
              <DebugSection label="params" copyText={JSON.stringify(params, null, 2)}>
                {JSON.stringify(params, null, 2)}
              </DebugSection>
              <DebugSection label="diagnostic query" copyText={diagnosticQuery}>
                {diagnosticQuery}
              </DebugSection>
              <DebugSection label="graph response" copyText={resultText}>
                {resultText}
              </DebugSection>
            </div>
          </div>
        </div>
      )}
    </div>,
    slot
  );
}
