// Shared, edge-safe helper for the FX visitor-id cookie. Written domain-wide so it
// is a single cookie shared with the Optimizely Web snippet (which uses the same
// name at the registrable-domain scope) instead of a host-only duplicate that resets
// can't reach. Dependency-free - safe for middleware, route handlers and the browser.

import { VISITOR_ID_COOKIE as VISITOR_COOKIE } from "./cookieNames";

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Registrable domain (dotted, e.g. ".joshuaonwezen.dev") for real custom domains;
// undefined (host-only) for localhost, IPs, and platform public suffixes where a
// shared parent-domain cookie is invalid or undesirable (e.g. *.vercel.app).
function visitorCookieDomain(host: string): string | undefined {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h || h === "localhost" || /^[0-9.]+$/.test(h)) return undefined;
  const parts = h.split(".");
  if (parts.length < 2) return undefined;
  const registrable = parts.slice(-2).join(".");
  if (["vercel.app", "now.sh", "pages.dev", "github.io"].includes(registrable)) return undefined;
  return "." + registrable;
}

// The cookie strings that write the canonical domain-wide visitor cookie and purge
// any legacy host-only cookie of the same name, so readers only ever see the current
// value. Usable as Set-Cookie header values or, in order, as document.cookie writes.
export function visitorCookieStrings(userId: string, host: string): string[] {
  const domain = visitorCookieDomain(host);
  const base = `${VISITOR_COOKIE}=${userId}; Path=/; Max-Age=${VISITOR_MAX_AGE}; SameSite=Lax`;
  if (!domain) return [base];
  // Expire any stale host-only cookie (no Domain) so it can't shadow the shared one.
  return [`${base}; Domain=${domain}`, `${VISITOR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`];
}

export function appendVisitorCookie(headers: Headers, userId: string, host: string): void {
  for (const cookie of visitorCookieStrings(userId, host)) headers.append("Set-Cookie", cookie);
}
