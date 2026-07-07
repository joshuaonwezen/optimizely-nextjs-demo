import { type NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag as _revalidateTag } from "next/cache";

// Next.js 16 requires a second `profile` arg in its types, but route handlers
// have no valid profile to pass (updateTag is Server Actions only). Cast to the
// single-arg overload so the runtime's immediate-invalidation path is used.
const revalidateTag = _revalidateTag as (tag: string) => void;

export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * Optimizely Graph webhook receiver.
 *
 * Register this URL via `npm run webhook:register` — the script appends
 * ?secret=OPTIMIZELY_REVALIDATE_SECRET to the registered URL, since Graph
 * webhook registration only controls the URL, not custom headers.
 *
 * Webhook payload types:
 *   - bulk.completed  – Graph finished processing a content sync
 *   - doc.updated     – a single content item was updated
 *   - doc.expired     – a content item reached its StopPublish date
 */
export async function POST(request: NextRequest) {
  const secret =
    request.nextUrl.searchParams.get("secret") ??
    request.headers.get("x-revalidate-secret");

  if (secret !== process.env.OPTIMIZELY_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    console.log("[Optimizely Graph Webhook] Event received:", body);

    revalidatePath("/", "layout");
    revalidateTag("page");
    revalidateTag("navigation");
    revalidateTag("banner");
    revalidateTag("footer");
    revalidateTag("settings");
    revalidateTag("quotes");

    return NextResponse.json({ received: true, timestamp: Date.now() });
  } catch (error) {
    console.error("[Webhook] Failed to parse body:", error);
    return NextResponse.json({ error: "Failed to parse body" }, { status: 400 });
  }
}
