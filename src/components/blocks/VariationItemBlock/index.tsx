import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { asSdkComponentContent, asSdkContent } from "@/components/cms/sdkTypes";
import { CONTENT_AREA_EXCLUDES } from "@/lib/optimizely/contentAreaExcludes.mjs";

// One variation inside a VariationContainerBlock: the FX variation key it answers to,
// plus any blocks. Child-only - it is in CONTENT_AREA_EXCLUDES, so it never appears in
// an open page content area.
//
// No compositionBehaviors, like NavigationItem: a content area rules out
// elementEnabled, and sectionEnabled would offer it as a Visual Builder section.
export const VariationItemBlockType = contentType({
  key: "VariationItemBlock",
  displayName: "Variation",
  baseType: "_component",
  properties: {
    variationKey: {
      type: "string",
      displayName: "FX variation key",
      description:
        "Must match a variation key on the container's flag exactly (case-sensitive), e.g. control or treatment.",
      isRequired: true,
      indexingType: "queryable",
    },
    // type "content" (not contentReference) so Graph inline-expands the blocks in the
    // same page query. VariationContainerBlock is excluded: a container inside its own
    // variation could never be queried (a GraphQL fragment cannot spread itself).
    blocks: {
      type: "array",
      displayName: "Blocks",
      items: {
        type: "content",
        allowedTypes: ["_component"],
        restrictedTypes: [...CONTENT_AREA_EXCLUDES, "VariationContainerBlock"],
      },
    },
  },
});

export interface VariationItemData {
  __typename?: string;
  variationKey?: string | null;
  blocks?: unknown[] | null;
  __context?: { edit?: boolean } | null;
}

type VariationItemBlockProps = VariationItemData & {
  content?: VariationItemData;
};

// Renders the variation's blocks. VariationContainerBlock decides WHICH variation is
// shown; this component only lays out what the editor put in it.
export default function VariationItemBlock(props: VariationItemBlockProps) {
  const data: VariationItemData = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const blocks = data.blocks ?? [];

  if (blocks.length === 0) {
    return data.__context?.edit ? (
      <p {...pa("blocks")} className="px-8 py-10 text-sm text-on-surface-variant text-center">
        Add blocks to this variation
      </p>
    ) : null;
  }

  return (
    <div {...pa("blocks")} data-component="VariationItemBlock">
      {blocks.map((block, i) => (
        <BlockErrorBoundary key={i}>
          <OptimizelyComponent content={asSdkComponentContent(block)} />
        </BlockErrorBoundary>
      ))}
    </div>
  );
}
