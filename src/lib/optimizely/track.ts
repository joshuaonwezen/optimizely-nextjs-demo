"use client";

import { getOptimizelyBrowserClient } from "./browser-client";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))?.[1] ?? "";
}

function getVisitorId(): string {
  const existing = readCookie("optimizelyEndUserId");
  if (existing) return existing;
  const fresh = crypto.randomUUID();
  document.cookie = `optimizelyEndUserId=${fresh}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return fresh;
}

export async function trackEvent(
  eventKey: string,
  tags?: Record<string, string | number | boolean | null | undefined>
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const client = await getOptimizelyBrowserClient();
    if (!client) return;
    await client.onReady();
    const userId = getVisitorId();
    const attributes: Record<string, string> = {};
    const persona = readCookie("demo_persona");
    if (persona) attributes.persona = persona;
    const user = client.createUserContext(userId, attributes);
    if (!user) return;
    const cleanTags: Record<string, string | number | boolean> = {};
    if (tags) {
      for (const [k, v] of Object.entries(tags)) {
        if (v === undefined || v === null) continue;
        cleanTags[k] = v;
      }
    }
    user.trackEvent(eventKey, cleanTags);
  } catch {
    // Tracking must never break the page.
  }
}
