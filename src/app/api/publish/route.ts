import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Publish event webhook.
 *
 * Configure this URL in CMS Settings > Events so that when content is published,
 * the CMS sends a POST request here.
 *
 * Usage: POST /api/publish
 * Header: x-revalidate-secret must match OPTIMIZELY_REVALIDATE_SECRET
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (secret !== process.env.OPTIMIZELY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    console.log("[Optimizely] Content published:", body);

    revalidatePath("/", "layout");

    return NextResponse.json({ received: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json(
      { error: "Failed to process publish event" },
      { status: 500 }
    );
  }
}
