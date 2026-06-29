import {
  OptimizelyGridSection,
  getPreviewUtils,
  type StructureContainerProps,
} from "@optimizely/cms-sdk/react/server";
import { graphqlFetch } from "@/lib/optimizely/client";

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
};

// Form fields nest inside the container as composition child nodes. The native
// CMS structure is section (OptiFormsContainerData) → row → column → elements,
// so the container renders its grid like a section. Stacked, full-width layout.
function Row({ children, node }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

function Column({ children, node }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

export default async function OptiFormsContainer(props: OptiFormsContainerProps) {
  const node = props.content ?? props;
  const nodes: any[] = node.nodes ?? [];

  let data: OptiFormsContainerData = node;
  if (node.displayName && node.SubmitUrl === undefined && node.Title === undefined) {
    const res = await graphqlFetch<{
      OptiFormsContainerData?: { items?: OptiFormsContainerData[] };
    }>(FORM_PROPS_QUERY, { name: node.displayName }, { next: { revalidate: 60, tags: ["page"] } }).catch(
      () => null
    );
    const item = res?.data?.OptiFormsContainerData?.items?.[0];
    if (item) data = { ...node, ...item };
  }

  const { pa } = getPreviewUtils(node as any);

  return (
    <section
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
        <OptimizelyGridSection nodes={nodes} row={Row} column={Column} />
      )}
    </section>
  );
}
