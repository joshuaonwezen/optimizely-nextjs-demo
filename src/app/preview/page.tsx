import { getClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { NextPreviewComponent } from "@optimizely/cms-sdk/react/nextjs";
import { redirect } from "next/navigation";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

export const dynamic = "force-dynamic";

initComponentRegistry();

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function isTokenError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("token") || msg.includes("expired");
}

async function PreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";

  const client = getClient();
  let content = null;
  try {
    content = await client.getPreviewContent(params as PreviewParams);
  } catch (error) {
    if (isTokenError(error)) {
      // Expired or invalid preview token - redirect to published version if URL is known
      const publishedUrl = typeof params.url === "string" ? params.url : "/";
      redirect(publishedUrl);
    }
    // Deleted or unpublished content - fall through to empty state below
    console.error("[Preview] Content not found:", error);
  }

  return (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <NextPreviewComponent />
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
