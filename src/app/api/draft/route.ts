import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/**
 * Draft mode API route.
 *
 * When an editor clicks "Preview" in Optimizely CMS, the CMS redirects to this
 * handler with preview context parameters. We enable Next.js draft mode and
 * redirect to the actual content path with the preview token preserved.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const key = searchParams.get("key");
  const version = searchParams.get("ver");
  const locale = searchParams.get("loc") ?? "en";
  const ctx = searchParams.get("ctx") ?? "preview";
  const epipreview = searchParams.get("epipreview");
  const path = searchParams.get("path") ?? "/";

  const draft = await draftMode();
  draft.enable();

  const previewUrl = new URL(path, request.url);
  if (key) previewUrl.searchParams.set("key", key);
  if (version) previewUrl.searchParams.set("ver", version);
  if (epipreview) previewUrl.searchParams.set("epipreview", epipreview);
  previewUrl.searchParams.set("ctx", ctx);
  previewUrl.searchParams.set("loc", locale);

  redirect(previewUrl.pathname + previewUrl.search);
}
