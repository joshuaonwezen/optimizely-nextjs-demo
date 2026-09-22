"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordCategoryView, readTopCategories } from "@/lib/personalization/readCategories";
import { trackEvent } from "@/lib/tracking";
import { recordTopCategory } from "@/lib/tracking/destinations/odp";
import { keyFromTermUri } from "@/lib/taxonomy";

// Emits the CMS categories of the page being read, once per pathname.
//
// Routing through the existing trackEvent() means the categories fan out to all three
// destinations for free (FX, ODP, GA4) and pick up exp_variant_string on the way, so
// "which categories does someone in the challenger arm read" is answerable without any
// extra plumbing. AutoTracker is deliberately untouched: it keys off the path and has
// no access to a page's taxonomy.

export default function ReadCategorySignal({ uris }: { uris: string[] }) {
  const pathname = usePathname();
  const key = uris.join(",");

  useEffect(() => {
    if (uris.length === 0) return;

    recordCategoryView(uris);

    const primary = keyFromTermUri(uris[0]) ?? uris[0];
    void trackEvent("mb_content_viewed", {
      categories: key,
      primary_category: primary,
    });

    // Read back AFTER recording, so the attribute reflects this view too.
    recordTopCategory(readTopCategories()[0], primary);
    // pathname keeps this to once per page rather than once per render.
  }, [pathname, key, uris]);

  return null;
}
