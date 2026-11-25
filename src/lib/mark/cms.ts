import "server-only";
import { getManagementToken } from "@/lib/optimizely/auth";

const CONTENT_ENDPOINT = "https://api.cms.optimizely.com/v1/content";
const TTL_MS = 5 * 60_000;
const CONCURRENCY = 10;

const checked = new Map<string, { gone: boolean; at: number }>();

async function isGone(key: string, token: string): Promise<boolean> {
  const cached = checked.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.gone;
  const response = await fetch(`${CONTENT_ENDPOINT}/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  // Only a 404 says "gone". A 429 or 5xx says nothing, so the page is kept.
  const gone = response.status === 404;
  if (response.ok || gone) checked.set(key, { gone, at: Date.now() });
  return gone;
}

// Graph is not the authority on which pages exist. On joshCMS, 11 of the 99
// pages it lists as published cannot be opened in the CMS: blueprints (page
// templates, indexed as pages under /blueprints/) and items deleted long ago
// whose documents were never removed. Nothing in the Graph document tells them
// apart, so each key is asked for once through the CMS REST API.
//
// Returns the keys the CMS does not have, or null when it could not be asked
// (no Management API credentials on this deployment).
export async function keysMissingFromCms(keys: string[]): Promise<Set<string> | null> {
  if (!process.env.OPTIMIZELY_CMS_CLIENT_ID || !process.env.OPTIMIZELY_CMS_CLIENT_SECRET) return null;

  try {
    const token = await getManagementToken();
    const unique = [...new Set(keys)];
    const missing = new Set<string>();
    for (let start = 0; start < unique.length; start += CONCURRENCY) {
      await Promise.all(
        unique.slice(start, start + CONCURRENCY).map(async (key) => {
          if (await isGone(key, token)) missing.add(key);
        })
      );
    }
    return missing;
  } catch (error) {
    console.error("[mark] could not check page keys against the CMS:", error);
    return null;
  }
}
