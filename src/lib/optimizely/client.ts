/**
 * GraphQL Client for Optimizely Graph.
 *
 * Uses native fetch (not Apollo) for zero-dependency GraphQL requests.
 * Supports two auth modes:
 *   - Published content: "epi-single {singleKey}" header
 *   - Draft/preview content: "Bearer {previewToken}" header (from CMS iframe)
 *
 * Next.js caching is applied automatically:
 *   - Published: ISR with 60s revalidation
 *   - Draft: no-store (always fresh)
 */

const GRAPH_ENDPOINT =
  process.env.OPTIMIZELY_GRAPH_GATEWAY ?? "https://cg.optimizely.com/content/v2";

const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

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

/**
 * Execute a typed GraphQL query against Optimizely Graph.
 */
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
    fetchOptions.next = { revalidate: 60 };
  } else {
    fetchOptions.cache = "no-store";
  }

  const response = await fetch(GRAPH_ENDPOINT, fetchOptions);

  if (!response.ok) {
    throw new Error(
      `GraphQL request failed: ${response.status} ${response.statusText}`
    );
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    console.error("[GraphQL Errors]", JSON.stringify(result.errors, null, 2));
  }

  return result;
}
