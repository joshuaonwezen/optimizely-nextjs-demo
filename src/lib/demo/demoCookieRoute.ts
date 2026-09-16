import { NextResponse } from "next/server";

const ONE_DAY = 60 * 60 * 24;
const MAX_VALUE_LENGTH = 200;

/**
 * Shared body of the /api/demo/set-* routes: read one field from the JSON body and
 * store it in a 1-day demo cookie, or clear the cookie when the field is empty.
 * `toCookieValue` returns null for "clear". Malformed JSON is a 400, not a 500.
 */
export async function setDemoCookie(
  request: Request,
  cookieName: string,
  toCookieValue: (body: Record<string, unknown>) => string | null
): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const value = toCookieValue(body);
  if (value !== null && value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json({ error: "Value too long" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  if (value) {
    response.cookies.set(cookieName, value, { path: "/", sameSite: "lax", maxAge: ONE_DAY });
  } else {
    response.cookies.delete(cookieName);
  }
  return response;
}

/** A non-empty string field, or null. */
export function stringField(body: Record<string, unknown>, field: string): string | null {
  const value = body[field];
  return typeof value === "string" && value ? value : null;
}
