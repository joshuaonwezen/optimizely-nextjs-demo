export function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

export function getVisitorId(): string {
  const existing = readCookie("optimizelyEndUserId");
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  document.cookie = `optimizelyEndUserId=${fresh}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return fresh;
}
