import type { ReactNode } from "react";
import {
  OptimizelyGridSection,
  getPreviewUtils,
} from "@optimizely/cms-sdk/react/server";
import { cacheTag } from "next/cache";
import { cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { NodeWrapper } from "@/components/experience/CompositionExperience";

interface OptiFormsContainerData {
  key?: string | null;
  type?: string | null;
  displayName?: string | null;
  Title?: string | null;
  Description?: string | null;
  SubmitUrl?: { default?: string | null } | null;
  SubmitConfirmationMessage?: string | null;
  nodes?: any[] | null;
  __context?: { edit?: boolean } | null;
}

// Resolve the container's own properties by display name. When a shared Form
// Container is referenced in a page composition, the SDK passes only the section's
// structural fields to this component, not its scalar properties.
const FORM_PROPS_QUERY = /* GraphQL */ `
  query FormContainerProps($name: String!) {
    OptiFormsContainerData(where: { _metadata: { displayName: { eq: $name } } }, limit: 1) {
      items { Title Description SubmitUrl { default } SubmitConfirmationMessage }
    }
  }
`;

type OptiFormsContainerProps = OptiFormsContainerData & {
  content?: OptiFormsContainerData;
  /** Field blocks rendered directly (the /demo/forms page); the CMS passes `nodes` instead. */
  children?: ReactNode;
};

// Form fields nest inside the container as composition child nodes. The native
// CMS structure is section (OptiFormsContainerData) → row → column → elements,
// so the container renders its grid like a section. Stacked, full-width layout.
// Rows and columns carry no styling of their own - plain preview-attributed divs.

type FormPropsResult = { OptiFormsContainerData?: { items?: OptiFormsContainerData[] } };

// Only the display name crosses the cache boundary. The component's own props
// hold SDK composition nodes and the NodeWrapper component, none of which
// are serializable, so never pass `node` or `props` in here.
async function fetchFormProps(name: string): Promise<FormPropsResult> {
  "use cache";
  cacheTag("page");
  cachePublishedContent();

  try {
    return await graphClient().request(FORM_PROPS_QUERY, { name });
  } catch (error) {
    return cachedQueryFailed("fetchFormProps", error);
  }
}

export default async function OptiFormsContainer(props: OptiFormsContainerProps) {
  const node = props.content ?? props;
  const nodes: any[] = node.nodes ?? [];

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

  const { pa } = getPreviewUtils(node as any);

  // A real <form> scopes OptiFormsSubmit to this container's fields (several forms
  // can share a page) and gives Enter-to-submit plus native required validation.
  // OptiFormsSubmit intercepts the submit event, so the form never navigates.
  return (
    <form
      data-component="OptiFormsContainer"
      className="py-16"
      data-form-submit-url={data.SubmitUrl?.default ?? "/api/form-submit"}
      data-form-success-message={data.SubmitConfirmationMessage ?? "Thank you! We'll be in touch soon."}
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
          <p
            {...pa("Description")}
            className="text-base mb-2 text-on-surface-variant"
          >
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
      {nodes.length > 0 && (
        <OptimizelyGridSection nodes={nodes} row={NodeWrapper} column={NodeWrapper} />
      )}
      {props.children}
    </form>
  );
}
