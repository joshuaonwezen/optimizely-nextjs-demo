import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { asSdkComponentContent, asSdkContent } from "@/components/cms/sdkTypes";
import { CONTENT_AREA_EXCLUDES } from "@/lib/optimizely/contentAreaExcludes.mjs";
import { pageContainer, type Placement } from "../_shared/displayTemplateSettings";

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
  placement?: Placement;
};

// OptimizelyComponent forwards extra props to the block it renders (GridComponentWrapper
// relies on the same), but its type does not declare them.
const BlockComponent = OptimizelyComponent as (
  props: Parameters<typeof OptimizelyComponent>[0] & { placement?: Placement }
) => ReturnType<typeof OptimizelyComponent>;

// Renders the variation's blocks. VariationContainerBlock decides WHICH variation is
// shown; this component only lays out what the editor put in it.
//
// A variation stands in for a Visual Builder section, so it supplies the page container
// a section row would (BlankSection's default width) and tells its blocks they sit
// inside one. Element-level blocks like SectionHeadingBlock and CallToAction bring no
// container of their own, and rendered bare they ran flush to the viewport edge.
export default function VariationItemBlock(props: VariationItemBlockProps) {
  const data: VariationItemData = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const blocks = data.blocks ?? [];
  const container = pageContainer(props.placement, "max-w-7xl mx-auto px-8") || undefined;

  if (blocks.length === 0) {
    return data.__context?.edit ? (
      <p {...pa("blocks")} className="px-8 py-10 text-sm text-on-surface-variant text-center">
        Add blocks to this variation
      </p>
    ) : null;
  }

  return (
    <div {...pa("blocks")} data-component="VariationItemBlock" className={container}>
      {blocks.map((block, i) => (
        <BlockErrorBoundary key={i}>
          <BlockComponent content={asSdkComponentContent(block)} placement="element" />
        </BlockErrorBoundary>
      ))}
    </div>
  );
}
