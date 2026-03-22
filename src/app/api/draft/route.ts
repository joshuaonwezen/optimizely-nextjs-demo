import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

/**
 * Draft mode API route — enables Next.js draft mode and redirects to /preview.
 *
 * Alternative entry point: redirects to the SDK-powered /preview page
 * which uses GraphClient.getPreviewContent() for live preview.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const draft = await draftMode();
  draft.enable();

  const previewUrl = new URL("/preview", request.url);
  for (const [k, v] of searchParams.entries()) {
    previewUrl.searchParams.set(k, v);
  }

  redirect(previewUrl.pathname + previewUrl.search);
}
