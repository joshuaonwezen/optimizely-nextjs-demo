import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { pageViews } = await request.json();
  const response = NextResponse.json({ ok: true });
  if (typeof pageViews === "number") {
    response.cookies.set("demo_page_views", String(pageViews), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  } else {
    response.cookies.delete("demo_page_views");
  }
  return response;
}
