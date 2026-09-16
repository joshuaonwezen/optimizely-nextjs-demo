import { VISITOR_ID_COOKIE } from "@/lib/optimizely/cookieNames";
import { visitorCookieStrings } from "@/lib/optimizely/visitorCookie";

export function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

// Middleware normally sets the id first; this covers a page that ran before it did.
// Written the same domain-wide way as the middleware, not as a host-only duplicate.
export function getVisitorId(): string {
  const existing = readCookie(VISITOR_ID_COOKIE);
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  for (const cookie of visitorCookieStrings(fresh, window.location.hostname)) document.cookie = cookie;
  return fresh;
}
