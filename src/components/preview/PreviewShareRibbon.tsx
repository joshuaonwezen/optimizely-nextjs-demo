"use client";

import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/useIsClient";

// "Draft preview" banner for the read-only external share route. Portalled into
// the same top slot as PreviewToolbar so it sits above the site nav.
export default function PreviewShareRibbon({ version }: { version: string | null }) {
  const isClient = useIsClient();
  if (!isClient) return null;
  const slot = document.getElementById("preview-topbar-slot");
  if (!slot) return null;

  return createPortal(
    <div
      data-component="PreviewShareRibbon"
      className="border-b border-outline-variant bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-black"
    >
      Draft preview{version ? ` (v${version})` : ""} - this content is not published
    </div>,
    slot
  );
}
