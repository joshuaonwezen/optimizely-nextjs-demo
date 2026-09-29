// Shared, edge-safe helper for the FX visitor-id cookie. Written domain-wide so it
// is a single cookie shared with the Optimizely Web snippet (which uses the same
// name at the registrable-domain scope) instead of a host-only duplicate that resets
// can't reach. Scoping lives in cookieScope.ts, which every cookie the server reads
// back goes through.

import { VISITOR_ID_COOKIE as VISITOR_COOKIE } from "./cookieNames";
import { scopedCookieStrings } from "./cookieScope";

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// The cookie strings that write the canonical domain-wide visitor cookie and purge
// any legacy host-only cookie of the same name, so readers only ever see the current
// value. Usable as Set-Cookie header values or, in order, as document.cookie writes.
export function visitorCookieStrings(userId: string, host: string): string[] {
  return scopedCookieStrings(VISITOR_COOKIE, userId, { host, maxAge: VISITOR_MAX_AGE });
}

export function appendVisitorCookie(headers: Headers, userId: string, host: string): void {
  for (const cookie of visitorCookieStrings(userId, host)) headers.append("Set-Cookie", cookie);
}
