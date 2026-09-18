"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

// Demo-only control panel mounted in the root layout, so a static import put it
// in the shared chunk for every route. It is interactive-only and never part of
// first paint, so it loads on the client after hydration instead.
const AudienceSwitcher = dynamic(() => import("./AudienceSwitcher"), {
  ssr: false,
});

export default function DemoToolbar() {
  const pathname = usePathname();
  // The audience switcher is a personalization demo aid - it has no place on the
  // editorial /preview route, which carries its own preview tooling.
  if (pathname?.startsWith("/preview")) return null;
  return <AudienceSwitcher />;
}
