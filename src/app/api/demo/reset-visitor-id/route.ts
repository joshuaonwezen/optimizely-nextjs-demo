import { NextResponse } from "next/server";

export async function POST() {
  const newId = crypto.randomUUID();
  const response = NextResponse.json({ ok: true, userId: newId });
  response.cookies.set("optimizelyEndUserId", newId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    secure: false,
  });
  return response;
}
