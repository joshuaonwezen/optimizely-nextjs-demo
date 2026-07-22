const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Default time-based ISR window (seconds) for published content. Freshness is
// driven by the publish webhook (revalidatePath/revalidateTag); this 1-hour TTL
// is the fallback ceiling. Keep the `export const revalidate` in the catch-all
// page route in sync with this value.
export const CACHE_TTL = 3600;

export interface GraphQLRequestOptions {
  /** Bearer token from CMS iframe for draft/preview content */
  previewToken?: string;
  /** Next.js fetch revalidation config */
  next?: { revalidate?: number; tags?: string[] };
  /** Override fetch cache behavior */
  cache?: RequestCache;
}

export interface GraphQLResponse<T> {
  data: T | null;
  errors?: Array<{ message: string; locations?: unknown; path?: unknown }>;
}

export async function graphqlFetch<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
  options: GraphQLRequestOptions = {}
): Promise<GraphQLResponse<T>> {
  const { previewToken, next, cache } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (previewToken) {
    headers["Authorization"] = `Bearer ${previewToken}`;
  } else {
    headers["Authorization"] = `epi-single ${SINGLE_KEY}`;
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  };

  if (cache) {
    fetchOptions.cache = cache;
  } else if (next) {
    fetchOptions.next = next;
  } else if (!previewToken) {
    fetchOptions.next = { revalidate: CACHE_TTL };
  } else {
    fetchOptions.cache = "no-store";
  }

  const response = await fetch(GRAPH_ENDPOINT, fetchOptions);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GraphQL request failed: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`
    );
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    console.error("[GraphQL Errors]", JSON.stringify(result.errors, null, 2));
  }

  return result;
}
