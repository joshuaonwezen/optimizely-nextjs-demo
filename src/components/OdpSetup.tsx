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
  //
  // `page` MUST be included: the classic Zaius tag does not auto-attach the URL to a manually
  // dispatched event, so URL-conditioned audiences (e.g. "page contains /business") have nothing
  // to match without it. Any-pageview audiences (active_visitors) work regardless; page-specific
  // ones never qualify until the URL is on the event.
  useEffect(() => {
    const fsUserId = getCookie("optimizelyEndUserId");
    const page = window.location.href;
    window.zaius?.event("pageview", fsUserId ? { fs_user_id: fsUserId, page } : { page });
  }, [pathname]);

  return null;
}
