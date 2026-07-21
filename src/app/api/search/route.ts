import { type NextRequest, NextResponse } from "next/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import {
  SEARCH_FACETED_QUERY,
  SEARCH_RELEVANCE_QUERY,
  SEARCH_SEMANTIC_QUERY,
} from "@/lib/graphql/queries/SearchContent";

const SINGLE_KEY = process.env.OPTIMIZELY_GRAPH_SINGLE_KEY ?? "";

function listParam(value: string | null): string[] | null {
  const parsed = value?.split(",").map((v) => v.trim()).filter(Boolean) ?? [];
  return parsed.length > 0 ? parsed : null; // null = Graph ignores the filter
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q      = searchParams.get("q")?.trim() ?? "";
  const mode   = searchParams.get("mode") === "semantic" ? "semantic" : "relevance";
  const weight = Math.min(1, Math.max(0, parseFloat(searchParams.get("weight") ?? "0.5")));
  const locale = [searchParams.get("locale") ?? "en"];

  if (!q || q.length < 2) {
    return NextResponse.json({ total: 0, items: [] });
  }

  if (searchParams.get("facets") === "1") {
    return facetedSearch(q, listParam(searchParams.get("category")), listParam(searchParams.get("tags")), locale);
  }

  try {
    const result = await graphqlFetch<any>(
      mode === "semantic" ? SEARCH_SEMANTIC_QUERY : SEARCH_RELEVANCE_QUERY,
      mode === "semantic" ? { query: q, weight, locale } : { query: q, locale },
      { cache: "no-store" }
    );

    const raw = result.data?._Content ?? { total: 0, items: [] };

    const items = (raw.items ?? [])
      .filter((item: any) => item?._metadata?.displayName && item?._metadata?.url?.default)
      .map((item: any) => ({
        title:    item._metadata.displayName as string,
        url:      item._metadata.url.default as string,
        score:    (item._score as number | null | undefined) ?? 0,
        trackUrl: (() => {
          const t = item._track as string | null | undefined;
          return t && SINGLE_KEY ? `${t}&auth=${SINGLE_KEY}` : (t ?? null);
        })(),
      }));

    return NextResponse.json({ total: raw.total ?? items.length, items });
  } catch (error) {
    console.error("[Search] Query failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

async function facetedSearch(q: string, categories: string[] | null, tags: string[] | null, locale: string[] = ["en"]) {
  try {
    const result = await graphqlFetch<any>(
      SEARCH_FACETED_QUERY,
      { query: q, categories, tags, locale },
      { cache: "no-store" }
    );

    const raw = result.data?.ArticlePage ?? { total: 0, items: [], facets: {} };

    const items = (raw.items ?? [])
      .filter((item: any) => item?._metadata?.displayName && item?._metadata?.url?.default)
      .map((item: any) => ({
        title:    item._metadata.displayName as string,
        url:      item._metadata.url.default as string,
        score:    (item._score as number | null | undefined) ?? 0,
        category: (item.category as string | null | undefined) ?? null,
        tags:     (item.tags as string[] | null | undefined) ?? [],
      }));

    return NextResponse.json({
      total: raw.total ?? items.length,
      items,
      facets: {
        category: raw.facets?.category ?? [],
        tags:     raw.facets?.tags ?? [],
      },
    });
  } catch (error) {
    console.error("[Search] Faceted query failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
