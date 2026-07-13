import { getClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { NextPreviewComponent } from "@optimizely/cms-sdk/react/nextjs";
import { redirect } from "next/navigation";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { graphqlFetch } from "@/lib/optimizely/client";
import { PREVIEW_DIAGNOSTIC_QUERY } from "@/lib/graphql/queries/PreviewDiagnostic";
import PreviewDebugOverlay, {
  type ServedMetadata,
} from "@/components/preview/PreviewDebugOverlay";

export const dynamic = "force-dynamic";

initComponentRegistry();

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

function isTokenError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return msg.includes("401") || msg.includes("403") || msg.includes("unauthorized") || msg.includes("forbidden") || msg.includes("token") || msg.includes("expired");
}

// Graph _metadata.locale can be a scalar or a { name } object depending on the
// query - the overlay just wants a display string.
function localeToString(locale: unknown): string | null {
  if (typeof locale === "string") return locale;
  if (locale && typeof locale === "object" && "name" in locale) {
    return String((locale as { name?: unknown }).name ?? "") || null;
  }
  return null;
}

async function PreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";
  const serverRenderedAt = new Date().toISOString();

  const client = getClient();
  let content = null;
  let fetchError: string | undefined;
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
    fetchError = error instanceof Error ? error.message : String(error);
  }

  // Debug overlay data (preview-only). Never let diagnostics break the preview.
  const meta = (content?._metadata ?? {}) as Record<string, unknown>;
  const served: ServedMetadata | null = content
    ? {
        key: (meta.key as string) ?? null,
        version: (meta.version as string | number) ?? null,
        status: (meta.status as string) ?? null,
        locale: localeToString(meta.locale),
        variation: (meta.variation as string) ?? null,
      }
    : null;

  const previewToken = typeof params.preview_token === "string" ? params.preview_token : undefined;
  const contentKey = typeof params.key === "string" ? params.key : undefined;
  const diagnosticResult = contentKey
    ? await graphqlFetch(PREVIEW_DIAGNOSTIC_QUERY, { key: contentKey }, { previewToken }).catch(
        (e) => ({ data: null, errors: [{ message: String(e) }] })
      )
    : null;

  const redactedParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (typeof v !== "string") continue;
    redactedParams[k] = k === "preview_token" ? `${v.slice(0, 6)}…(${v.length} chars)` : v;
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
      <PreviewDebugOverlay
        params={redactedParams}
        served={served}
        serverRenderedAt={serverRenderedAt}
        diagnosticQuery={PREVIEW_DIAGNOSTIC_QUERY}
        diagnosticResult={diagnosticResult}
        fetchError={fetchError}
      />
    </>
  );
}

export default withAppContext(PreviewPage);
