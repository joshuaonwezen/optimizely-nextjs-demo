"use client";

import { usePathname } from "next/navigation";
import AudienceSwitcher from "./AudienceSwitcher";

export default function DemoToolbar() {
  const pathname = usePathname();
  // The audience switcher is a personalization demo aid - it has no place on the
  // editorial /preview route, which carries its own preview tooling.
  if (pathname?.startsWith("/preview")) return null;
  return <AudienceSwitcher />;
}
