import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { bucketingId } = await request.json();
  const response = NextResponse.json({ ok: true });
  if (bucketingId) {
    response.cookies.set("demo_bucketing_id", bucketingId, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  } else {
    response.cookies.delete("demo_bucketing_id");
  }
  return response;
}
