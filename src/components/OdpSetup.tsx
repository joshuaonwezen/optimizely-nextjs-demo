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

  // Fire a pageview so ODP can qualify the visitor for pageview-based real-time segments.
  // Pass ONLY the fs_user_id identifier - do NOT pass a `page` field: the ODP Web SDK
  // auto-parses the page URL from the browser context and populates the normalized
  // "Page > URL" entity that segment rules (e.g. "Page > URL contains business") read.
  // Passing `page` manually suppresses that normalization, leaving "Page > URL" empty so
  // URL-conditioned segments match nobody. fs_user_id is stitched to the anonymous vuid via
  // the entity() call above, so the pageview is attributed to the unified customer profile.
  useEffect(() => {
    const fsUserId = getCookie("optimizelyEndUserId");
    window.zaius?.event("pageview", fsUserId ? { fs_user_id: fsUserId } : undefined);
  }, [pathname]);

  return null;
}
