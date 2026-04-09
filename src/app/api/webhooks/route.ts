import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true });
}

/**
 * Optimizely Graph webhook receiver.
 *
 * Register this URL via `npm run webhook:register`.
 * Optimizely Graph will POST here whenever content changes (publish, expire, bulk sync).
 *
 * Webhook payload types:
 *   - bulk.completed  – Graph finished processing a content sync
 *   - doc.updated     – a single content item was updated
 *   - doc.expired     – a content item reached its StopPublish date
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Optimizely Graph Webhook] Event received:", body);

    return NextResponse.json({ received: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 400 });
  }
}
