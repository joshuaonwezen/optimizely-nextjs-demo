import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Only one cookie - a stable visitor ID for consistent bucketing.
  // Device type is read from the User-Agent header server-side (no cookie = GDPR safe).
  if (!request.cookies.get("optimizelyEndUserId")) {
    response.cookies.set("optimizelyEndUserId", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
