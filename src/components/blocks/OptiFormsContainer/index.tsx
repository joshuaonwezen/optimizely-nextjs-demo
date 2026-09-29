import type { ReactNode } from "react";
import {
  OptimizelyGridSection,
  getPreviewUtils,
} from "@optimizely/cms-sdk/react/server";
import { FormStep, partitionFormNodes } from "@optimizely/cms-sdk/forms/react";
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { NodeWrapper } from "@/components/experience/CompositionExperience";
import { asSdkContent, type CompositionNode } from "@/components/cms/sdkTypes";
import FormShell from "./FormShell";

interface OptiFormsContainerData {
  key?: string | null;
  type?: string | null;
  displayName?: string | null;
  Title?: string | null;
  Description?: string | null;
  SubmitUrl?: { default?: string | null } | null;
  SubmitConfirmationMessage?: string | null;
  DependencyRules?: unknown;
  nodes?: CompositionNode[] | null;
  _metadata?: { key?: string | null } | null;
  __context?: { edit?: boolean } | null;
}

// Resolve the container's own properties by display name. When a shared Form
// Container is referenced in a page composition, the SDK passes only the section's
// structural fields to this component, not its scalar properties.
const FORM_PROPS_QUERY = /* GraphQL */ `
  query FormContainerProps($name: String!) {
    OptiFormsContainerData(where: { _metadata: { displayName: { eq: $name } } }, limit: 1) {
      items {
        _metadata { key }
        Title
        Description
        SubmitUrl { default }
        SubmitConfirmationMessage
        DependencyRules
      }
    }
  }
`;

type OptiFormsContainerProps = OptiFormsContainerData & {
  content?: OptiFormsContainerData;
  /** Field blocks rendered directly (the /demo/forms page); the CMS passes `nodes` instead. */
  children?: ReactNode;
  /** Renders the submit request/response panel (/demo/forms only). */
  showDebug?: boolean;
};

type FormPropsResult = { OptiFormsContainerData?: { items?: OptiFormsContainerData[] } };

/** A structure node (step, row, column) as opposed to a component node. */
type StructureNode = Extract<CompositionNode, { nodes?: unknown }>;

const isStepNode = (node: CompositionNode): node is StructureNode => node.nodeType === "step";

// Only the display name crosses the cache boundary. The component's own props
// hold SDK composition nodes and the NodeWrapper component, none of which
// are serializable, so never pass `node` or `props` in here.
async function fetchFormProps(name: string): Promise<FormPropsResult> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(FORM_PROPS_QUERY, { name });
  } catch (error) {
    return cachedQueryFailed("fetchFormProps", error);
  }
}

export default async function OptiFormsContainer(props: OptiFormsContainerProps) {
  const node = props.content ?? props;
  const nodes = node.nodes ?? [];

  let data: OptiFormsContainerData = node;
  if (node.displayName && node.SubmitUrl === undefined && node.Title === undefined) {
    // In the Visual Builder the editor must see live values, so skip the cache
    // entirely there - otherwise a cached entry could serve up-to-an-hour-stale
    // form properties while they are being edited. Same split as the preview
    // branch in GetNavigation.ts.
    const isEditing = Boolean((node as { __context?: { edit?: boolean } }).__context?.edit);
    const res = await (isEditing
      ? graphClient().request(FORM_PROPS_QUERY, { name: node.displayName }, undefined, false)
      : fetchFormProps(node.displayName)
    ).catch(() => null);
    const item = res?.OptiFormsContainerData?.items?.[0];
    if (item) data = { ...node, ...item };
  }

  const { pa } = getPreviewUtils(asSdkContent(node));

  // Editors put Next / Previous / Submit wherever they like, often each in its own
  // row. partitionFormNodes pulls them out at any depth so they lay out as one
  // footer, and drops the rows left empty behind them.
  const { content: contentNodes, buttons } = partitionFormNodes(nodes);
  const steps = contentNodes.filter(isStepNode);

  return (
    <div data-component="OptiFormsContainer" className="py-16">
      <FormShell
        action={data.SubmitUrl?.default ?? "/api/form-submit"}
        successMessage={data.SubmitConfirmationMessage ?? "Thank you! We'll be in touch soon."}
        formKey={data._metadata?.key ?? node.key ?? undefined}
        steps={steps}
        rules={data.DependencyRules}
        showDebug={props.showDebug}
      >
        <div className="max-w-2xl mx-auto px-8">
          {data.Title && (
            <h2
              {...pa("Title")}
              className="font-display text-3xl font-extrabold mb-4 text-on-surface"
            >
              {data.Title}
            </h2>
          )}
          {data.Description && (
            <p {...pa("Description")} className="text-base mb-2 text-on-surface-variant">
              {data.Description}
            </p>
          )}
          {data.__context?.edit && (
            <p
              {...pa("SubmitConfirmationMessage")}
              className="mt-4 text-xs font-mono text-on-surface-variant/60 cursor-pointer hover:text-on-surface-variant transition-colors"
            >
              Success: {data.SubmitConfirmationMessage || "Click to set success message..."}
            </p>
          )}
        </div>

        {/* A multi-step form: only the active step is visible, but every step stays
            mounted so values survive stepping back and submit validates all of them.
            OptimizelyGridSection has no handler for nodeType "step" - it renders one
            as a bare fragment - so the steps are wrapped here rather than there. */}
        {steps.length > 0
          ? steps.map((step, index) => (
              <FormStep key={step.key} index={index} node={step}>
                <OptimizelyGridSection
                  nodes={step.nodes ?? []}
                  row={NodeWrapper}
                  column={NodeWrapper}
                />
              </FormStep>
            ))
          : contentNodes.length > 0 && (
              <OptimizelyGridSection nodes={contentNodes} row={NodeWrapper} column={NodeWrapper} />
            )}

        {buttons.length > 0 && (
          <div className="max-w-2xl mx-auto px-8 pt-4 flex flex-wrap gap-3">
            <OptimizelyGridSection nodes={buttons} row={NodeWrapper} column={NodeWrapper} />
          </div>
        )}

        {props.children}
      </FormShell>
    </div>
  );
}
