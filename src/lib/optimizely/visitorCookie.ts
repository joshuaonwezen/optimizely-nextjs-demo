// Shared, edge-safe helper for the FX visitor-id cookie. Written domain-wide so it
// is a single cookie shared with the Optimizely Web snippet (which uses the same
// name at the registrable-domain scope) instead of a host-only duplicate that resets
// can't reach. No imports — safe to use from Edge middleware and route handlers.

export const VISITOR_COOKIE = "optimizelyEndUserId";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Registrable domain (dotted, e.g. ".joshuaonwezen.dev") for real custom domains;
// undefined (host-only) for localhost, IPs, and platform public suffixes where a
// shared parent-domain cookie is invalid or undesirable (e.g. *.vercel.app).
export function visitorCookieDomain(host: string): string | undefined {
  const h = (host || "").split(":")[0].toLowerCase();
  if (!h || h === "localhost" || /^[0-9.]+$/.test(h)) return undefined;
  const parts = h.split(".");
  if (parts.length < 2) return undefined;
  const registrable = parts.slice(-2).join(".");
  if (["vercel.app", "now.sh", "pages.dev", "github.io"].includes(registrable)) return undefined;
  return "." + registrable;
}

// Appends Set-Cookie headers that write the canonical domain-wide visitor cookie and
// purge any legacy host-only cookie of the same name, so getCookie can only ever read
// the current value.
export function appendVisitorCookie(headers: Headers, userId: string, host: string): void {
  const domain = visitorCookieDomain(host);
  const base = `${VISITOR_COOKIE}=${userId}; Path=/; Max-Age=${VISITOR_MAX_AGE}; SameSite=Lax`;
  headers.append("Set-Cookie", domain ? `${base}; Domain=${domain}` : base);
  // Expire any stale host-only cookie (no Domain) so it can't shadow the shared one.
  if (domain) headers.append("Set-Cookie", `${VISITOR_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
}
