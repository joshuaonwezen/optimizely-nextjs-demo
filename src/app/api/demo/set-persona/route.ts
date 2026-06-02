import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { persona } = await request.json();
  const response = NextResponse.json({ ok: true });
  if (persona) {
    response.cookies.set("demo_persona", persona, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });
  } else {
    response.cookies.delete("demo_persona");
  }
  return response;
}
