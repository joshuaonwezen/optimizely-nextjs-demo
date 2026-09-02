import { type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { NextPreviewComponent } from "@optimizely/cms-sdk/react/nextjs";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { getPreviewClient } from "@/lib/optimizely/previewClient";
import { graphqlFetch } from "@/lib/optimizely/client";
import { PREVIEW_DIAGNOSTIC_QUERY } from "@/lib/graphql/queries/PreviewDiagnostic";
import { buildExternalPreviewQuery } from "@/lib/preview/shareLink";
import PreviewDebugOverlay, {
  type ServedMetadata,
} from "@/components/preview/PreviewDebugOverlay";
import ExternalPreviewLink from "@/components/preview/ExternalPreviewLink";

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

  const client = getPreviewClient();
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
    // SDK collapses GraphQL errors to "N errors ... Check 'errors' object" - surface
    // the individual messages so the overlay shows the real cause (e.g. Unknown type).
    const graphErrors = (error as { errors?: Array<{ message?: string }> })?.errors;
    if (Array.isArray(graphErrors) && graphErrors.length) {
      fetchError += ` — ${graphErrors.map((e) => e.message).join("; ")}`;
    }
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

  // Signed external preview links - shareable with people who have no CMS login.
  const hdrs = await headers();
  const origin = (() => {
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
    if (!host) return "";
    return `${hdrs.get("x-forwarded-proto") ?? "https"}://${host}`;
  })();
  const shareLoc = typeof params.loc === "string" ? params.loc : "en";
  const shareVer = typeof params.ver === "string" ? params.ver : undefined;
  const pinnedQuery =
    origin && contentKey
      ? buildExternalPreviewQuery({ key: contentKey, loc: shareLoc, ver: shareVer })
      : null;
  const latestQuery =
    origin && contentKey
      ? buildExternalPreviewQuery({ key: contentKey, loc: shareLoc })
      : null;
  const pinnedUrl = pinnedQuery ? `${origin}/preview/share${pinnedQuery}` : null;
  const latestUrl = latestQuery ? `${origin}/preview/share${latestQuery}` : null;

  return (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <NextPreviewComponent />

      {/* In-flow toolbar at the top of the preview - fixed/sticky chrome is
          unreliable inside the CMS preview iframe (it strands at the page
          bottom and covers content links), so keep it in normal flow. */}
      <div className="relative z-[2147483647] flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-lowest px-4 py-2">
        <span className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-on-surface-variant">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          Editorial preview
        </span>
        <div className="flex items-center gap-2">
          <ExternalPreviewLink
            pinnedUrl={pinnedUrl}
            latestUrl={latestUrl}
            version={served?.version != null ? String(served.version) : (shareVer ?? null)}
          />
          <PreviewDebugOverlay
            params={redactedParams}
            served={served}
            serverRenderedAt={serverRenderedAt}
            diagnosticQuery={PREVIEW_DIAGNOSTIC_QUERY}
            diagnosticResult={diagnosticResult}
            fetchError={fetchError}
          />
        </div>
      </div>

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
