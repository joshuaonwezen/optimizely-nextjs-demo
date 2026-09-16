import { cacheTag } from "next/cache";
import { cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

export interface RedirectRule {
  fromPath: string;
  toPath: string;
  permanent: boolean;
  matchSubpaths: boolean;
}

interface RawRule {
  fromPath?: string | null;
  toPath?: string | null;
  permanent?: boolean | null;
  matchSubpaths?: boolean | null;
  enabled?: boolean | null;
}

interface GetRedirectConfigResult {
  RedirectConfig?: {
    items?: Array<{ rules?: Array<RawRule | null> | null } | null> | null;
  } | null;
}

// Fetch the RedirectConfig singleton by type, newest first so a re-seeded block
// (or a lingering deleted doc) never wins. No `where` on `enabled`: filtering on
// a field the Graph schema hasn't synced as queryable errors the whole query
// (same reason GetSiteBanner filters in JS), so the enabled check happens below.
const GET_REDIRECT_RULES_QUERY = /* GraphQL */ `
  query GetRedirectRules {
    RedirectConfig(orderBy: { _metadata: { lastModified: DESC } }, limit: 10) {
      items {
        rules {
          ... on RedirectRule {
            fromPath
            toPath
            permanent
            matchSubpaths
            enabled
          }
        }
      }
    }
  }
`;

// Leading slash, collapse repeated slashes, drop the trailing slash (except
// root). Absolute http(s) destinations are left untouched.
function normalizeRedirectPath(input: string): string {
  let s = (input ?? "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) s = "/" + s;
  s = s.replace(/\/{2,}/g, "/");
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s;
}

// The cache boundary is this function, not the fetch: the SDK's request() does
// not forward next: { revalidate, tags }. Only the /api/redirects route handler
// calls this - middleware reaches the rules over HTTP, never by import.
async function fetchRedirectConfig(): Promise<GetRedirectConfigResult> {
  "use cache";
  cacheTag("redirects");
  cachePublishedContent();

  try {
    return await graphClient().request(GET_REDIRECT_RULES_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchRedirectConfig", error);
  }
}

export async function getRedirectRules(): Promise<RedirectRule[]> {
  try {
    const result = await fetchRedirectConfig();

    const raw = result?.RedirectConfig?.items?.[0]?.rules ?? [];

    return raw
      .filter((r): r is RawRule => !!r && r.enabled !== false && !!r.fromPath && !!r.toPath)
      .map((r) => ({
        fromPath: normalizeRedirectPath(r.fromPath as string),
        toPath: normalizeRedirectPath(r.toPath as string),
        permanent: r.permanent === true,
        matchSubpaths: r.matchSubpaths === true,
      }))
      .filter((r) => r.fromPath && r.toPath)
      // Longest fromPath first so an exact rule beats a shorter prefix rule.
      .sort((a, b) => b.fromPath.length - a.fromPath.length);
  } catch (error) {
    console.error("[getRedirectRules] No redirects applied:", error);
    return [];
  }
}
