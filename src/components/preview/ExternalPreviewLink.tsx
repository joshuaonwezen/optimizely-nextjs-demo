"use client";

import { useState, useSyncExternalStore } from "react";
import CopyButton from "@/components/ui/CopyButton";

interface Props {
  /** Absolute link pinned to the version currently being previewed. */
  pinnedUrl: string | null;
  /** Absolute link that always resolves the newest version. */
  latestUrl: string | null;
  /** Version number of the pinned link, for the label. */
  version?: string | null;
}

const STORAGE_KEY = "preview-share-link";

const switchListeners = new Set<() => void>();

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

// Persisted on/off switch, mirrors PreviewDebugOverlay. Defaults to off so editors
// who never share links are not bothered. useSyncExternalStore keeps SSR (off) and
// hydration in sync.
function useShareEnabled(): [boolean, (v: boolean) => void] {
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

export default function ExternalPreviewLink({ pinnedUrl, latestUrl, version }: Props) {
  const [enabled, setEnabled] = useShareEnabled();
  const [collapsed, setCollapsed] = useState(true);
  const [mode, setMode] = useState<"pinned" | "latest">("pinned");

  // Feature is unconfigured (OPTIMIZELY_PREVIEW_SECRET unset) - render nothing.
  if (!pinnedUrl && !latestUrl) return null;

  const activeUrl = (mode === "latest" ? latestUrl : pinnedUrl) ?? pinnedUrl ?? latestUrl ?? "";

  if (!enabled) {
    return (
      <button
        data-component="ExternalPreviewLink"
        type="button"
        onClick={() => setEnabled(true)}
        title="Share an external preview link"
        aria-label="Share an external preview link"
        className="fixed bottom-3 right-3 z-[2147483647] flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[11px] text-white/70 opacity-40 shadow hover:opacity-100"
      >
        🔗
      </button>
    );
  }

  if (collapsed) {
    return (
      <div
        data-component="ExternalPreviewLink"
        className="fixed bottom-3 right-3 z-[2147483647] flex items-center gap-2 rounded-full bg-black/80 py-1.5 pl-3 pr-1.5 font-mono text-[11px] text-white shadow-lg backdrop-blur"
      >
        <button type="button" onClick={() => setCollapsed(false)} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
          share link
        </button>
        <button
          type="button"
          onClick={() => setEnabled(false)}
          title="Hide share link box"
          aria-label="Hide share link box"
          className="rounded px-1 text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      data-component="ExternalPreviewLink"
      className="fixed bottom-3 right-3 z-[2147483647] w-80 max-w-[calc(100vw-1.5rem)] rounded-xl bg-black/85 font-mono text-white shadow-2xl backdrop-blur"
    >
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
          External preview link
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded px-1.5 text-white/60 hover:text-white"
            title="Collapse"
            aria-label="Collapse share link box"
          >
            –
          </button>
          <button
            type="button"
            onClick={() => setEnabled(false)}
            className="rounded px-1.5 text-white/60 hover:text-white"
            title="Hide"
            aria-label="Hide share link box"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="space-y-2 px-3 pb-3">
        <div className="flex gap-1 rounded bg-white/5 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMode("pinned")}
            disabled={!pinnedUrl}
            className={`flex-1 rounded px-2 py-1 ${
              mode === "pinned" ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
            } disabled:opacity-30`}
          >
            This version{version ? ` (v${version})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setMode("latest")}
            disabled={!latestUrl}
            className={`flex-1 rounded px-2 py-1 ${
              mode === "latest" ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
            } disabled:opacity-30`}
          >
            Always latest
          </button>
        </div>

        <textarea
          readOnly
          value={activeUrl}
          rows={3}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded bg-black/40 p-2 text-[10px] leading-relaxed text-white/80"
        />

        <div className="flex items-center justify-between">
          <CopyButton
            text={activeUrl}
            label="copy link"
            className="rounded bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide hover:bg-white/20"
          />
        </div>

        <p className="text-[10px] leading-snug text-white/50">
          Anyone with this link can view the draft - no CMS login. It stays valid until the
          preview secret is rotated.
        </p>
      </div>
    </div>
  );
}
