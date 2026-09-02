"use client";

import { useState } from "react";

interface Props {
  text: string;
  className?: string;
  /** Label shown when idle. Defaults to "copy". */
  label?: string;
}

// Small clipboard button used by the preview overlays (dark chrome). Shows a
// transient "copied" state and silently no-ops where the Clipboard API is absent.
export default function CopyButton({ text, className, label = "copy" }: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      data-component="CopyButton"
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
      className={
        className ??
        "rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide hover:bg-white/20"
      }
    >
      {copied ? "copied" : label}
    </button>
  );
}
