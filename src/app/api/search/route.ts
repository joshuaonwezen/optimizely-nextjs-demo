import { type NextRequest, NextResponse } from "next/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { SEARCH_RELEVANCE_QUERY, SEARCH_SEMANTIC_QUERY } from "@/lib/graphql/queries/SearchContent";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q      = searchParams.get("q")?.trim() ?? "";
  const mode   = searchParams.get("mode") === "semantic" ? "semantic" : "relevance";
  const weight = Math.min(1, Math.max(0, parseFloat(searchParams.get("weight") ?? "0.5")));

  if (!q || q.length < 2) {
    return NextResponse.json({ total: 0, items: [] });
  }

  try {
    const result = await graphqlFetch<any>(
      mode === "semantic" ? SEARCH_SEMANTIC_QUERY : SEARCH_RELEVANCE_QUERY,
      mode === "semantic" ? { query: q, weight } : { query: q },
      { cache: "no-store" }
    );

    const raw = result.data?._Page ?? { total: 0, items: [] };

    const items = (raw.items ?? [])
      .filter((item: any) => item?._metadata?.displayName && item?._metadata?.url?.default)
      .map((item: any) => ({
        title: item._metadata.displayName as string,
        url:   item._metadata.url.default as string,
        score: (item._score as number | null | undefined) ?? 0,
      }));

    return NextResponse.json({ total: raw.total ?? items.length, items });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
