import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";

export interface QuoteBlock {
  author: string;
  role:   string;
  text:   string;
}

interface RawQuoteBlock {
  author?: string | null;
  role?:   string | null;
  text?:   string | null;
}

interface GetQuoteBlocksResult {
  QuoteBlock?: {
    items?: Array<RawQuoteBlock | null> | null;
  } | null;
}

export const GET_QUOTE_BLOCKS_QUERY = /* GraphQL */ `
  query GetQuoteBlocks {
    QuoteBlock(limit: 100, orderBy: { author: ASC }) {
      items {
        author
        role
        text
      }
    }
  }
`;

// Cached at the function, not the fetch: the SDK's request() does not forward
// next: { revalidate, tags }.
async function fetchQuoteBlocks(): Promise<GetQuoteBlocksResult> {
  "use cache";
  cacheTag(CACHE_TAGS.quoteBlocks);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_QUOTE_BLOCKS_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchQuoteBlocks", error);
  }
}

export async function getQuoteBlocks(): Promise<{ items: QuoteBlock[]; fromGraph: boolean }> {
  try {
    const result = await fetchQuoteBlocks();

    const raw = result?.QuoteBlock?.items ?? [];
    const items = raw
      .filter((q): q is RawQuoteBlock => q !== null)
      .map((q) => ({
        author: q.author ?? "",
        role:   q.role   ?? "",
        text:   q.text   ?? "",
      }))
      .filter((q) => q.author !== "");

    if (items.length === 0) return { items: [], fromGraph: false };
    return { items, fromGraph: true };
  } catch (error) {
    console.error("[getQuoteBlocks] Returning no quote blocks:", error);
    return { items: [], fromGraph: false };
  }
}
