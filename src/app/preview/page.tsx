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

  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });

  const response = await client.getPreviewContent(
    (await searchParams) as PreviewParams
  );

  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";
  const nodes = response?.composition?.nodes ?? [];

  return (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <PreviewComponent />
      {nodes.map((node: any) =>
        node.nodeType === "section" ? (
          <div key={node.key} data-epi-block-id={node.key}>
            <OptimizelyGridSection nodes={node.nodes ?? []} />
          </div>
        ) : (
          <div key={node.key} data-epi-block-id={node.key}>
            <OptimizelyGridSection nodes={[node]} />
          </div>
        )
      )}
    </>
  );
}
