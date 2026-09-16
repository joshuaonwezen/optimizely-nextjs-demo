import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
  type StructureContainerProps,
} from "@optimizely/cms-sdk/react/server";
import type { ExperienceContent } from "@/components/cms/sdkTypes";

/**
 * Wraps a composition node in a div carrying its preview attributes, so the
 * Visual Builder overlay can target it. Serves as a ComponentWrapper for
 * OptimizelyComposition and as a plain row/column for OptimizelyGridSection.
 */
export function NodeWrapper({ children, node }: ComponentContainerProps | StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

/**
 * Renders an experience's built-in composition with no chrome of its own.
 * DynamicExperience and BlankExperience are both exactly this, differing only in
 * the `data-component` name they emit.
 */
export function CompositionExperience({ name, content }: { name: string; content: ExperienceContent }) {
  const nodes = content?.composition?.nodes ?? [];
  return (
    <div data-component={name}>
      <OptimizelyComposition nodes={nodes} ComponentWrapper={NodeWrapper} />
    </div>
  );
}
