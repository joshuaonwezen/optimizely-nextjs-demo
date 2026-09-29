// Cookie scoping shared by every cookie the server reads back. Writing one host-only
// (no Domain) is the trap: a cookie of the same name already scoped to the registrable
// domain cannot be overwritten by it, so the browser ends up sending both and the
// server reads whichever the Cookie header lists first - usually the older one. The
// symptom is a control that looks like it worked while the server never changes its
// mind. Every writer goes through these helpers so that pair can never exist.
// Dependency-free - safe for middleware, route handlers and the browser.

const SAME_SITE = "Path=/; SameSite=Lax";

// Registrable domain (dotted, e.g. ".joshuaonwezen.dev") for real custom domains;
// undefined (host-only) for localhost, IPs, and platform public suffixes where a
// shared parent-domain cookie is invalid or undesirable (e.g. *.vercel.app).
export function cookieDomain(host: string): string | undefined {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h || h === "localhost" || /^[0-9.]+$/.test(h)) return undefined;
  const parts = h.split(".");
  if (parts.length < 2) return undefined;
  const registrable = parts.slice(-2).join(".");
  if (["vercel.app", "now.sh", "pages.dev", "github.io"].includes(registrable)) return undefined;
  return "." + registrable;
}

// Writes the canonical domain-wide cookie and purges any legacy host-only cookie of
// the same name, so readers only ever see the current value. Omit maxAge for a
// session cookie. Usable as Set-Cookie header values or, in order, as
// document.cookie writes.
export function scopedCookieStrings(
  name: string,
  value: string,
  { host, maxAge }: { host: string; maxAge?: number }
): string[] {
  const domain = cookieDomain(host);
  const base = `${name}=${value}; Path=/${maxAge === undefined ? "" : `; Max-Age=${maxAge}`}; SameSite=Lax`;
  if (!domain) return [base];
  // Expire any stale host-only cookie (no Domain) so it can't shadow the shared one.
  return [`${base}; Domain=${domain}`, `${name}=; ${SAME_SITE}; Max-Age=0`];
}

// Expires a cookie in BOTH scopes. A delete has to match the scope it was set in, so
// clearing only one leaves the other to be read on the next request.
export function expireCookieStrings(name: string, host: string): string[] {
  const domain = cookieDomain(host);
  const hostOnly = `${name}=; ${SAME_SITE}; Max-Age=0`;
  return domain ? [`${hostOnly}; Domain=${domain}`, hostOnly] : [hostOnly];
}
