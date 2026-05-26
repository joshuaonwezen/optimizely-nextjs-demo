import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get("fx_user_id")) {
    response.cookies.set("fx_user_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  if (!request.cookies.get("fx_device")) {
    const ua = request.headers.get("user-agent") ?? "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    response.cookies.set("fx_device", device, {
      maxAge: 60 * 60 * 24 * 365,
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
