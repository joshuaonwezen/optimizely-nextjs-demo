import { type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { notFound } from "next/navigation";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import {
  getAdminPreviewClient,
  resolveLatestVersion,
} from "@/lib/optimizely/adminPreviewClient";
import { verifyExternalPreview } from "@/lib/preview/shareLink";

export const dynamic = "force-dynamic";

initComponentRegistry();

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Read-only render of an unpublished draft for people with no CMS login. The
// incoming link is signed (verifyExternalPreview); the draft is fetched with
// super-user Basic auth (getAdminPreviewClient), never the ~5-minute preview
// token. No communicationinjector / NextPreviewComponent / debug overlay - this
// is not an editable surface.
async function ExternalPreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const target = verifyExternalPreview(params);
  if (!target) notFound();

  let content = null;
  let servedVer: string | null = target.ver ?? null;
  try {
    const ver = target.ver ?? (await resolveLatestVersion(target.key, target.loc));
    if (ver) {
      servedVer = ver;
      content = await getAdminPreviewClient().getPreviewContent({
        key: target.key,
        loc: target.loc,
        ver,
        ctx: "preview",
        preview_token: "",
      } as PreviewParams);
    }
  } catch (error) {
    console.error("[ExternalPreview] fetch failed:", error);
  }
  if (!content) notFound();

  return (
    <>
      <div className="sticky top-0 z-50 bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-black">
        Draft preview{servedVer ? ` (v${servedVer})` : ""} - this content is not published
      </div>
      <OptimizelyComponent content={content} />
    </>
  );
}

export default withAppContext(ExternalPreviewPage);
