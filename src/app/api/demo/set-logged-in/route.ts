import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { loggedIn } = await request.json();
  const response = NextResponse.json({ ok: true });
  if (loggedIn) {
    response.cookies.set("demo_logged_in", "true", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  } else {
    response.cookies.delete("demo_logged_in");
  }
  return response;
}
