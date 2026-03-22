import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { graphqlFetch } from "@/lib/optimizely/client";

/**
 * Preview route for Optimizely CMS Visual Builder.
 *
 * The CMS sends editors here with:
 *   /preview?key={key}&ver={version}&loc={locale}&ctx=edit&preview_token={token}
 *
 * We enable Next.js draft mode and resolve the content key to a URL path,
 * then redirect the editor to the actual page with preview context preserved.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const key = searchParams.get("key");
  const version = searchParams.get("ver");
  const locale = searchParams.get("loc") ?? "en";
  const ctx = searchParams.get("ctx") ?? "edit";
  const previewToken = searchParams.get("preview_token");

  if (!key) {
    return new Response("Missing key parameter", { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  // Resolve the content key to a URL path via Graph
  let pagePath = "/";
  try {
    const result = await graphqlFetch<any>(
      /* GraphQL */ `
        query ResolvePreviewPath($key: String!) {
          _Page(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
            items {
              _metadata {
                url { default }
              }
            }
          }
        }
      `,
      { key },
      { previewToken: previewToken ?? undefined, cache: "no-store" }
    );

    const url = result.data?._Page?.items?.[0]?._metadata?.url?.default;
    if (url) {
      // Strip locale prefix to match Next.js routes (e.g. /en/cms/ → /cms)
      pagePath = url.replace(/^\/en\//, "/");
      if (pagePath === "/homepage/") pagePath = "/";
    }
  } catch {
    // If Graph lookup fails, fall back to root
  }

  const previewUrl = new URL(pagePath, request.url);
  previewUrl.searchParams.set("key", key);
  if (version) previewUrl.searchParams.set("ver", version);
  if (previewToken) previewUrl.searchParams.set("preview_token", previewToken);
  previewUrl.searchParams.set("ctx", ctx);
  previewUrl.searchParams.set("loc", locale);

  redirect(previewUrl.pathname + previewUrl.search);
}
