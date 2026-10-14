"use client";

import { Fragment, type ReactNode } from "react";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";

export interface RenderedVariant {
  key: string;
  /** The variation's blocks, already rendered on the server. */
  node: ReactNode;
}

// The browser path of VariationContainerBlock, used when middleware did not decide the
// flag for this request (no cms_flag, or cms_route does not cover this page). Every
// variant arrives server-rendered, so the swap is instant once the datafile loads -
// but until then this renders the fallback (variants[0]), on the server and on the
// first client render alike, which keeps hydration consistent.
export function VariationContainerClient({
  flagKey,
  variants,
}: {
  flagKey: string;
  variants: RenderedVariant[];
}) {
  const decision = useFxDecision(flagKey);
  const decidedKey = decision?.variationKey ?? null;
  const shown = variants.find((v) => decidedKey !== null && v.key === decidedKey) ?? variants[0];

  return (
    <div data-component="VariationContainerBlock" data-variation-source="browser" data-variation-key={shown.key}>
      {/* Keyed so a swap remounts the variant instead of reconciling one variant's
          blocks into another's state. */}
      <Fragment key={shown.key}>{shown.node}</Fragment>
      {/* Mounted for every resolved decision, including the "off" bucket: in an A/B
          rule "off" is a real arm, and skipping its impression would leave the
          control group out of the results. */}
      {decision && <FxBucketingEvent flagKey={flagKey} />}
    </div>
  );
}
