import { cloneElement, isValidElement } from "react";
import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
  type StructureContainerProps,
} from "@optimizely/cms-sdk/react/server";
import type { ExperienceContent } from "@/components/cms/sdkTypes";

// SDK 2.2.0 never hands a block its display template key (OptimizelyComponent only
// forwards content + displaySettings), so blocks that branch on
// props.displayTemplateKey always rendered their default layout. OptimizelyComponent
// spreads any extra prop into the block, so the wrappers inject the key here.
function withTemplateKey(children: React.ReactNode, node: { displayTemplateKey?: string | null }, extra = {}) {
  if (!isValidElement(children)) return children;
  return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    ...extra,
    displayTemplateKey: node.displayTemplateKey ?? undefined,
  });
}

/**
 * Wraps a composition node in a div carrying its preview attributes, so the
 * Visual Builder overlay can target it. Serves as a ComponentWrapper for
 * OptimizelyComposition and as a plain row/column for OptimizelyGridSection.
 */
export function NodeWrapper({ children, node }: ComponentContainerProps | StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{withTemplateKey(children, node)}</div>;
}

/**
 * ComponentWrapper for OptimizelyGridSection. Adds no element of its own: the
 * data-epi-* attributes go onto OptimizelyComponent, which wraps them in a div in
 * edit mode only - exactly what the SDK does when no wrapper is given. Also tells
 * the block it sits inside a column (placement "element"), so blocks that bring
 * their own page container can drop it.
 */
export function GridComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <>{withTemplateKey(children, node, { ...pa(node), placement: "element" })}</>;
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
