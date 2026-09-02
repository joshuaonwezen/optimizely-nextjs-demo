import { GraphClient } from "@optimizely/cms-sdk";
import { applyDamMetaProbe } from "./graphPreviewPatches";

type RequestFn = (
  query: string,
  variables: unknown,
  previewToken?: string,
  cache?: boolean,
  slot?: unknown
) => Promise<Record<string, unknown>>;

const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

function basicAuthHeader(): string {
  const appKey = process.env.OPTIMIZELY_APP_KEY ?? "";
  const appSecret = process.env.OPTIMIZELY_APP_SECRET ?? "";
  return `Basic ${Buffer.from(`${appKey}:${appSecret}`).toString("base64")}`;
}

let cached: GraphClient | null = null;

// A GraphClient that authenticates every request as super-user via Basic auth
// (App Key + Secret) instead of the ~5-minute CMS preview token. Optimizely Graph
// treats App Key + Secret as a super-user - it returns all content regardless of
// publication status, with no token expiry. Used only by the signed external
// preview route (src/app/preview/share); the credentials never leave the server.
//
// The SDK's request() hardcodes `Bearer <token>` / `epi-single <key>`
// (node_modules/@optimizely/cms-sdk/dist/esm/graph/index.js:193). Patching the
// instance's request() to force the Basic header lets the whole getPreviewContent
// pipeline (type resolution, typed query, context) run unchanged over super-user
// auth. Mirrors the existing instance-patch pattern in previewClient.ts.
export function getAdminPreviewClient(): GraphClient {
  if (cached) return cached;

  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "", {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });

  const holder = client as unknown as { request: RequestFn };
  holder.request = async (query, variables, _previewToken, cache = false) => {
    const url = new URL(GRAPH_ENDPOINT);
    url.searchParams.append("cache", String(cache));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuthHeader(),
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Graph request failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`
      );
    }
    // Match the SDK: a 200 with a partial `errors` array still returns `data`.
    const json = (await response.json()) as { data?: Record<string, unknown> };
    return json.data ?? {};
  };

  applyDamMetaProbe(client);
  cached = client;
  return client;
}

const LATEST_VERSION_QUERY = `query ExternalPreviewLatestVersion($key: String!, $loc: String!) {
  _Content(
    where: { _metadata: { key: { eq: $key }, locale: { eq: $loc } } }
    orderBy: { _metadata: { lastModified: DESC } }
    limit: 1
  ) {
    items { _metadata { version } }
  }
}`;

// Resolves the most recently modified version for a key + locale (draft OR
// published, whichever is the current tip), so an "always latest" share link
// tracks ongoing edits. Version ids are NOT sequential, so this orders by
// lastModified rather than picking a max. Returns null when the key/locale is
// unknown to Graph.
export async function resolveLatestVersion(key: string, loc: string): Promise<string | null> {
  const client = getAdminPreviewClient();
  const data = (await (client as unknown as { request: RequestFn }).request(
    LATEST_VERSION_QUERY,
    { key, loc },
    undefined,
    false
  )) as { _Content?: { items?: Array<{ _metadata?: { version?: string } }> } };

  return data._Content?.items?.[0]?._metadata?.version ?? null;
}
