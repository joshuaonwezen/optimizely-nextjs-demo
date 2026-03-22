import { GraphClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent } from "@optimizely/cms-sdk/react/server";
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

  const cmsUrl = process.env.OPTIMIZELY_CMS_URL ?? "";

  return (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <PreviewComponent />
      <OptimizelyComponent content={response} />
    </>
  );
}
