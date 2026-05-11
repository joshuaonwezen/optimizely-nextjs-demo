import { GraphClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyGridSection } from "@optimizely/cms-sdk/react/server";
import { PreviewComponent } from "@optimizely/cms-sdk/react/client";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PreviewPage({ searchParams }: Props) {
  initComponentRegistry();

  const params = await searchParams;
  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";
  const contentKey = typeof params.key === "string" ? params.key : undefined;
  const inEditMode = params.ctx === "edit";

  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });

  let nodes: any[] = [];
  try {
    const response = await client.getPreviewContent(params as PreviewParams);
    nodes = response?.composition?.nodes ?? [];
  } catch {
    // getPreviewContent can fail for shared blocks whose component fields don't
    // match the SDK's generated query (e.g. ContentReference fields queried as
    // scalars). Fall through to the manual _Component query below.
  }

  const shell = (children: React.ReactNode) => (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <PreviewComponent />
      {children}
    </>
  );

  // Primary path: page / experience with a composition (unchanged)
  if (nodes.length > 0) {
    return shell(
      nodes.map((node: any) =>
        node.nodeType === "section" ? (
          <div key={node.key} data-epi-block-id={node.key}>
            <OptimizelyGridSection nodes={node.nodes ?? []} />
          </div>
        ) : (
          <OptimizelyGridSection key={node.key} nodes={[node]} />
        )
      )
    );
  }

  // Fallback: shared block — no composition, so render a placeholder.
  // communicationinjector.js + data-epi-block-id keeps the CMS editing overlay active
  // so editors can use the properties panel on the right.
  return shell(
    contentKey ? (
      <div
        data-epi-block-id={inEditMode ? contentKey : undefined}
        className="m-8 rounded-xl border border-ghost-border bg-surface-low p-8 text-center"
      >
        <p className="text-lg font-semibold text-on-surface mb-1">Shared Block</p>
        <p className="text-sm font-mono text-on-surface-variant">{contentKey}</p>
        <p className="mt-3 text-sm text-on-surface-variant">
          Use the properties panel to edit this block.
        </p>
      </div>
    ) : null
  );
}
