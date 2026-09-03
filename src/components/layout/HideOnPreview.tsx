"use client";

import { usePathname } from "next/navigation";

// Site-visitor chrome (FX banner experiment, ODP recovery nudge) has no place on
// the editorial /preview route - it just adds noise above the content the editor
// is trying to check. Hide it there.
export default function HideOnPreview({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/preview")) return null;
  return <>{children}</>;
}
