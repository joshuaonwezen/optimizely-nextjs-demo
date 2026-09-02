import { createHmac, timingSafeEqual } from "crypto";

// External preview links let anyone (no CMS login) open a draft in the front end.
// The link carries NO Graph credential - only key/loc/(ver) plus an HMAC signature
// this app generates with OPTIMIZELY_PREVIEW_SECRET. The signature exists purely so
// a recipient cannot edit the query string to pull a different content key. Links
// never expire; rotating OPTIMIZELY_PREVIEW_SECRET invalidates every outstanding one.

export type ExternalPreviewTarget = {
  key: string;
  loc: string;
  /** Omit for an "always latest" link; include to pin a specific version. */
  ver?: string;
};

function secret(): string | null {
  const s = process.env.OPTIMIZELY_PREVIEW_SECRET;
  return s && s.length > 0 ? s : null;
}

function canonical(t: ExternalPreviewTarget): string {
  return `${t.key}\n${t.ver ?? ""}\n${t.loc}`;
}

function sign(t: ExternalPreviewTarget, s: string): string {
  return createHmac("sha256", s).update(canonical(t)).digest("base64url");
}

// Returns the query string (`?key=...&loc=...&sig=...`) for an external preview
// link, or null when OPTIMIZELY_PREVIEW_SECRET is unset (feature disabled).
export function buildExternalPreviewQuery(t: ExternalPreviewTarget): string | null {
  const s = secret();
  if (!s) return null;
  const params = new URLSearchParams({ key: t.key, loc: t.loc });
  if (t.ver) params.set("ver", t.ver);
  params.set("sig", sign(t, s));
  return `?${params.toString()}`;
}

// Verifies an incoming external preview request. Returns the validated target or
// null (caller should 404). Fails closed when the secret is unset.
export function verifyExternalPreview(params: {
  [key: string]: string | string[] | undefined;
}): ExternalPreviewTarget | null {
  const s = secret();
  if (!s) return null;

  const key = typeof params.key === "string" ? params.key : "";
  const loc = typeof params.loc === "string" ? params.loc : "";
  const ver = typeof params.ver === "string" ? params.ver : undefined;
  const sig = typeof params.sig === "string" ? params.sig : "";
  if (!key || !loc || !sig) return null;

  const expected = sign({ key, loc, ver }, s);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return { key, loc, ver };
}
