import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * On-demand ISR revalidation webhook.
 *
 * Configure this URL in CMS Settings > Events so that when content is published,
 * the CMS sends a POST to trigger page regeneration without a full redeploy.
 *
 * Usage: POST /api/revalidate with JSON body { "path": "/about/" }
 * Header: x-revalidate-secret must match OPTIMIZELY_REVALIDATE_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (secret !== process.env.OPTIMIZELY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path } = body;

    if (path) {
      revalidatePath(path);
    } else {
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ revalidated: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json(
      { error: "Revalidation failed" },
      { status: 500 }
    );
  }
}
