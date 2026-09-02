"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/useIsClient";

interface Props {
  /** Absolute link pinned to the version currently being previewed. */
  pinnedUrl: string | null;
  /** Absolute link that always resolves the newest version. */
  latestUrl: string | null;
  /** Version number of the pinned link, for the label. */
  version?: string | null;
}

// Floating "Share preview link" control for the /preview route. Styled to match
// the site chrome (same tokens as AudienceSwitcher), not the dark debug overlay.
// Portalled to <body> because the CMS preview harness makes <main> a containing
// block, which would otherwise strand a `fixed` child at the page bottom.
export default function ExternalPreviewLink({ pinnedUrl, latestUrl, version }: Props) {
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"pinned" | "latest">(pinnedUrl ? "pinned" : "latest");
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // Feature unconfigured (OPTIMIZELY_PREVIEW_SECRET unset) or not yet on the client.
  if (!isClient || (!pinnedUrl && !latestUrl)) return null;

  const activeUrl = (mode === "latest" ? latestUrl : pinnedUrl) ?? pinnedUrl ?? latestUrl ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return createPortal(
    <div
      data-component="ExternalPreviewLink"
      ref={ref}
      className="fixed bottom-4 right-4 z-[2147483647] flex flex-col items-end gap-2"
    >
      {open && (
        <div className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-outline-variant bg-surface-lowest shadow-xl">
          <p className="px-4 pt-3 pb-2 text-xs font-mono uppercase tracking-wider text-on-surface-variant">
            Share preview link
          </p>

          <div className="flex gap-1.5 px-4">
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

          <div className="px-4 pt-3">
            <input
              readOnly
              value={activeUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-lg border border-outline-variant bg-surface-low px-2.5 py-2 text-xs font-mono text-on-surface-variant"
            />
          </div>

          <div className="px-4 pt-2 pb-3">
            <button
              type="button"
              onClick={copy}
              className="w-full rounded-lg bg-brand-fill py-2 text-sm font-medium text-on-brand transition-colors hover:bg-brand-fill-dim"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          <p className="border-t border-outline-variant px-4 py-3 text-xs leading-snug text-on-surface-variant">
            Anyone with this link can view the draft — no CMS login. It stays valid until the
            preview secret is rotated.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-lowest py-2 pl-3 pr-4 text-sm font-medium text-on-surface shadow-lg transition-all hover:shadow-xl"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4 shrink-0 text-brand">
          <path
            fillRule="evenodd"
            d="M12.6 2.7a3.6 3.6 0 0 1 5.1 5.1l-2 2a1 1 0 0 1-1.5-1.4l2-2a1.6 1.6 0 1 0-2.3-2.3l-2 2a1 1 0 0 1-1.4-1.4l2-2Zm-3.3 4.4a1 1 0 0 1 0 1.4l-1.7 1.7a1 1 0 1 0 1.4 1.4l1.7-1.7a1 1 0 0 1 1.4 1.4l-1.7 1.7A3 3 0 0 1 6.2 8.8L7.9 7.1a1 1 0 0 1 1.4 0Zm3.8 1.4a1 1 0 0 1 1.4 0 3 3 0 0 1 0 4.2l-2.3 2.4a3 3 0 0 1-4.3-4.3 1 1 0 0 1 1.4 1.4 1 1 0 0 0 0 1.5 1 1 0 0 0 1.5 0l2.3-2.3a1 1 0 0 0 0-1.5 1 1 0 0 1 0-1.4Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs text-on-surface-variant">Preview</span>
        <span>Share link</span>
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
    </div>,
    document.body
  );
}
