import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

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
    QuoteBlock(limit: 100, orderBy: { author: { value: ASC } }) {
      items {
        author
        role
        text
      }
    }
  }
`;

export async function getQuoteBlocks(): Promise<{ items: QuoteBlock[]; fromGraph: boolean }> {
  try {
    const result = await graphqlFetch<GetQuoteBlocksResult>(
      GET_QUOTE_BLOCKS_QUERY,
      {},
      { next: { revalidate: CACHE_TTL, tags: ["quote-blocks"] } }
    );

    const raw = result.data?.QuoteBlock?.items ?? [];
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
  } catch {
    return { items: [], fromGraph: false };
  }
}
