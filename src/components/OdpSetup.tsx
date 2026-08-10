"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import "@/lib/tracking/destinations/odp";

function getCookie(name: string): string | undefined {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1];
}

export default function OdpSetup() {
  const pathname = usePathname();

  // Link the FX visitor ID to ODP once on mount so server-side segment
  // queries can use optimizelyEndUserId via the fs_user_id identifier.
  useEffect(() => {
    const fsUserId = getCookie("optimizelyEndUserId");
    if (fsUserId) window.zaius?.entity("customer", { fs_user_id: fsUserId });
  }, []);

  // Attach fs_user_id to the pageview so realtime segments (which are built on the pageview
  // event and evaluated at event time on the identifiers in the event) qualify the customer
  // profile - not just the anonymous vuid. Custom events already send it via odpDestination.
  useEffect(() => {
    const fsUserId = getCookie("optimizelyEndUserId");
    window.zaius?.event("pageview", fsUserId ? { fs_user_id: fsUserId } : undefined);
  }, [pathname]);

  return null;
}
