import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import { selectWxVariations } from "@/lib/optimizely/wxVariation";

interface GetVariationNamesResult {
  _Page?: {
    facets?: {
      _metadata?: {
        variation?: Array<{ name?: string | null } | null> | null;
      } | null;
    } | null;
  } | null;
}

// Every wx_* variation name on the instance, for middleware to validate a directly
// requested __v_wx--<name> path against. Deliberately instance-wide rather than
// per-page: middleware only needs to know the name is real CMS content and not a
// visitor-invented string that would mint a junk ISR entry. The page itself does the
// per-page match, because that is where the allowlist actually matters.
//
// A facet, not a page scan. Graph caps `limit` at 100 (a first pass at 1000 came back
// `HTTP 400: Invalid 'limit'`), so scanning items would silently miss variations on an
// instance with more than 100 pages. The facet returns the distinct values directly
// and needs no items at all, hence limit: 0.
//
// variation: { include: ALL } is required, not defensive: verified against Graph, the
// default excludes variation items entirely, so without it this facet is empty.
const GET_CMS_VARIATION_NAMES_QUERY = /* GraphQL */ `
  query GetCmsVariationNames {
    _Page(variation: { include: ALL }, limit: 0) {
      facets {
        _metadata {
          variation(limit: 100) {
            name
          }
        }
      }
    }
  }
`;

async function fetchVariationNames(): Promise<GetVariationNamesResult> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_CMS_VARIATION_NAMES_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchVariationNames", error);
  }
}

export async function getCmsVariationNames(): Promise<string[]> {
  try {
    const result = await fetchVariationNames();
    const buckets = result?._Page?.facets?._metadata?.variation ?? [];
    return selectWxVariations(buckets.map((b) => b?.name));
  } catch (error) {
    console.error("[getCmsVariationNames] No WX variations will validate:", error);
    return [];
  }
}
