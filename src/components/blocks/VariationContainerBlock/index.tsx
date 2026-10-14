import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { VariationItemBlockType, type VariationItemData } from "@/components/blocks/VariationItemBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { FxBucketingEvent } from "@/components/FxBucketingEvent";
import { asSdkComponentContent, asSdkContent } from "@/components/cms/sdkTypes";
import { edgeVariationFor } from "@/lib/optimizely/requestVariations";
import { VariationContainerClient } from "./VariationContainerClient";

// A block-level FX experiment. Editors build one Variation per FX variation key, out of
// any blocks, and Graph inline-expands all of them in the page's own query - no CMS
// (Visual Builder) variation and no Graph variation filter. This component then picks
// which one to render:
//
//   1. Edit mode   - every variation, stacked and labelled, so each can be edited.
//   2. Edge        - middleware decided the flag for this request (cms_flag + a
//                    cms_route covering this page) and the catch-all recorded the
//                    __v_ segment: render that variation on the server. No flicker,
//                    and each variation is its own ISR entry.
//   3. Browser     - no segment: VariationContainerClient decides with useFxDecision,
//                    showing the fallback until the datafile loads.
//
// The first variation is the fallback whenever nothing matches.
export const VariationContainerBlockType = contentType({
  key: "VariationContainerBlock",
  displayName: "Variation Container",
  baseType: "_component",
  // sectionEnabled only: a block with a content area cannot be elementEnabled.
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    flagKey: {
      type: "string",
      displayName: "FX flag key",
      description: "The Feature Experimentation flag that decides which variation a visitor sees. Must match exactly.",
      isRequired: true,
      indexingType: "queryable",
    },
    variations: {
      type: "array",
      displayName: "Variations",
      description:
        "One Variation per FX variation key. The first is the fallback: shown when the flag is off, the visitor is not bucketed, or no key matches.",
      items: { type: "content", allowedTypes: [VariationItemBlockType] },
    },
  },
});

interface VariationContainerData {
  flagKey?: string | null;
  variations?: Array<VariationItemData | null> | null;
  __context?: { edit?: boolean } | null;
}

type VariationContainerBlockProps = VariationContainerData & {
  content?: VariationContainerData;
};

function keyOf(variation: VariationItemData): string {
  return variation.variationKey?.trim() ?? "";
}

function renderVariation(variation: VariationItemData) {
  return (
    <BlockErrorBoundary>
      <OptimizelyComponent content={asSdkComponentContent(variation)} />
    </BlockErrorBoundary>
  );
}

export default function VariationContainerBlock(props: VariationContainerBlockProps) {
  const data: VariationContainerData = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const flagKey = data.flagKey?.trim() ?? "";
  const variations = (data.variations ?? []).filter((v): v is VariationItemData => !!v);

  if (data.__context?.edit) {
    return (
      <div data-component="VariationContainerBlock" data-variation-source="edit" className="max-w-7xl mx-auto px-8 py-8">
        <p {...pa("flagKey")} className="mb-4 text-xs font-mono text-on-surface-variant">
          Variation container · flag{" "}
          <span className="text-brand font-semibold">{flagKey || "(set an FX flag key)"}</span>
        </p>
        <div {...pa("variations")} className="space-y-6">
          {variations.length === 0 && (
            <p className="px-8 py-10 text-sm text-on-surface-variant text-center border border-dashed border-outline-variant rounded-2xl">
              Add one Variation for each FX variation key
            </p>
          )}
          {variations.map((variation, i) => (
            <div key={i} className="border border-dashed border-outline-variant rounded-2xl overflow-hidden">
              <p className="px-4 py-2 text-xs font-mono bg-surface-low text-on-surface-variant">
                Variation:{" "}
                <span className="text-on-surface font-semibold">{keyOf(variation) || "(no key)"}</span>
                {i === 0 && " · fallback"}
              </p>
              {renderVariation(variation)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variations.length === 0) return null;
  const fallback = variations[0];

  // Without a flag there is nothing to decide - and no impression to fire.
  if (!flagKey) {
    return (
      <div data-component="VariationContainerBlock" data-variation-source="fallback" data-variation-key={keyOf(fallback)}>
        {renderVariation(fallback)}
      </div>
    );
  }

  const edgeKey = edgeVariationFor(flagKey);
  if (edgeKey !== null) {
    const match = variations.find((v) => keyOf(v) === edgeKey);
    if (!match && process.env.NODE_ENV !== "production") {
      console.warn(
        `[VariationContainerBlock] flag "${flagKey}" decided "${edgeKey}" but no Variation has that key - rendering the fallback`
      );
    }
    const shown = match ?? fallback;
    return (
      <div data-component="VariationContainerBlock" data-variation-source="edge" data-variation-key={keyOf(shown)}>
        {renderVariation(shown)}
        <FxBucketingEvent flagKey={flagKey} />
      </div>
    );
  }

  return (
    <VariationContainerClient
      flagKey={flagKey}
      variants={variations.map((v) => ({ key: keyOf(v), node: renderVariation(v) }))}
    />
  );
}
