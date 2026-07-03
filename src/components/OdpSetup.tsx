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

  useEffect(() => {
    window.zaius?.event("pageview");
  }, [pathname]);

  return null;
}
