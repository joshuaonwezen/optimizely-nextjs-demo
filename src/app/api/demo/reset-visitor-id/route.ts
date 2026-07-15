import { NextResponse } from "next/server";
import { appendVisitorCookie } from "@/lib/optimizely/visitorCookie";

export async function POST(request: Request) {
  const newId = crypto.randomUUID();
  const response = NextResponse.json({ ok: true, userId: newId });
  // Overwrite the single shared (domain-wide) visitor cookie and purge any host-only
  // duplicate so the reset actually re-buckets. See visitorCookie.ts.
  appendVisitorCookie(response.headers, newId, request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "");
  return response;
}
