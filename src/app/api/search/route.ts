import { type NextRequest, NextResponse } from "next/server";
import { graphClient } from "@/lib/optimizely/graphClient";
import {
  SEARCH_FACETED_QUERY,
  SEARCH_RELEVANCE_QUERY,
  SEARCH_SEMANTIC_QUERY,
} from "@/lib/graphql/queries/SearchContent";
import { resolveCategoryUris } from "@/lib/taxonomy";

const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

// Pinned results carry a _score boosted by 2^32-1 (~4.29e9); organic scores stay
// in the hundreds/thousands. 1e9 is an unambiguous cutoff for flagging a pinned hit.
const PINNED_SCORE_THRESHOLD = 1_000_000_000;

// The fields read from a Graph search hit; request() itself is untyped.
interface SearchHit {
  _metadata?: { displayName?: string | null; url?: { default?: string | null } | null } | null;
  _itemMetadata?: { categories?: string[] | null } | null;
  _score?: number | null;
  _track?: string | null;
  category?: string | null;
  tags?: string[] | null;
}

type ListedHit = SearchHit & { _metadata: { displayName: string; url: { default: string } } };

function isListed(hit: SearchHit | null | undefined): hit is ListedHit {
  return Boolean(hit?._metadata?.displayName && hit._metadata.url?.default);
}

function listParam(value: string | null): string[] | null {
  const parsed = value?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
  return parsed.length > 0 ? parsed : null; // null = Graph ignores the filter
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q      = searchParams.get("q")?.trim() ?? "";
  const mode   = searchParams.get("mode") === "semantic" ? "semantic" : "relevance";
  const rawWeight = parseFloat(searchParams.get("weight") ?? "0.5");
  const weight = Number.isFinite(rawWeight) ? Math.min(1, Math.max(0, rawWeight)) : 0.5;
  const locale = [searchParams.get("locale") ?? "en"];
  // Fuzzy (typo-tolerant) matching is on by default; only an explicit fuzzy=0 disables it.
  const fuzzy  = searchParams.get("fuzzy") !== "0";

  if (!q || q.length < 2) {
    return NextResponse.json({ total: 0, items: [] });
  }

  if (searchParams.get("facets") === "1") {
    return facetedSearch(q, listParam(searchParams.get("category")), listParam(searchParams.get("tags")), locale, fuzzy);
  }

  try {
    // No "use cache" boundary: a user-typed query must never be cached, or every
    // unique phrase becomes a permanent entry that is never read again.
    const result = await graphClient().request(
      mode === "semantic" ? SEARCH_SEMANTIC_QUERY : SEARCH_RELEVANCE_QUERY,
      mode === "semantic" ? { query: q, weight, locale, fuzzy } : { query: q, locale, fuzzy }
    );

    const raw = result?.SEO ?? { total: 0, items: [] };

    const items = ((raw.items ?? []) as Array<SearchHit | null>)
      .filter(isListed)
      .map((item) => {
        const score = item._score ?? 0;
        const track = item._track;
        return {
          title:    item._metadata.displayName,
          url:      item._metadata.url.default,
          score,
          pinned:   score >= PINNED_SCORE_THRESHOLD,
          trackUrl: track && SINGLE_KEY ? `${track}&auth=${SINGLE_KEY}` : (track ?? null),
        };
      });

    return NextResponse.json({ total: raw.total ?? items.length, items });
  } catch (error) {
    console.error("[Search] Query failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

async function facetedSearch(q: string, categories: string[] | null, tags: string[] | null, locale: string[] = ["en"], fuzzy = true) {
  try {
    const result = await graphClient().request(SEARCH_FACETED_QUERY, {
      query: q,
      categories,
      tags,
      locale,
      fuzzy,
    });

    const raw = result?.ArticlePage ?? { total: 0, items: [], facets: {} };

    const items = ((raw.items ?? []) as Array<SearchHit | null>)
      .filter(isListed)
      .map((item) => ({
        title:    item._metadata.displayName,
        url:      item._metadata.url.default,
        score:    item._score ?? 0,
        // Category term URIs, falling back to the legacy enum for content that
        // has not been tagged in the CMS taxonomy yet.
        categories: resolveCategoryUris(item._itemMetadata?.categories, item.category),
        tags:     item.tags ?? [],
      }));

    return NextResponse.json({
      total: raw.total ?? items.length,
      items,
      facets: {
        // Bucket names are term URIs; the client resolves labels via src/lib/taxonomy.ts.
        category: raw.facets?._itemMetadata?.categories ?? [],
        tags:     raw.facets?.tags ?? [],
      },
    });
  } catch (error) {
    console.error("[Search] Faceted query failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
