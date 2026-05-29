export const dynamic = "force-dynamic";

import { getClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { PreviewComponent } from "@optimizely/cms-sdk/react/client";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

initComponentRegistry();

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function PreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";

  const client = getClient();
  const content = await client.getPreviewContent(params as PreviewParams);

  return (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <PreviewComponent />
      {content ? (
        <OptimizelyComponent content={content} />
      ) : (
        <div className="m-8 rounded-xl border border-ghost-border bg-surface-low p-8 text-center">
          <p className="text-sm text-on-surface-variant">
            No content found for preview parameters.
          </p>
        </div>
      )}
    </>
  );
}

export default withAppContext(PreviewPage);
