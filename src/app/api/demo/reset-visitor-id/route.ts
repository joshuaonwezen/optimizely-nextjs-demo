import { NextResponse } from "next/server";
import { requestHost } from "@/lib/optimizely/fxAttributes";
import { appendVisitorCookie } from "@/lib/optimizely/visitorCookie";

export async function POST(request: Request) {
  const newId = crypto.randomUUID();
  const response = NextResponse.json({ ok: true, userId: newId });
  // Overwrite the single shared (domain-wide) visitor cookie and purge any host-only
  // duplicate so the reset actually re-buckets. See visitorCookie.ts.
  appendVisitorCookie(response.headers, newId, requestHost(request.headers));
  return response;
}
