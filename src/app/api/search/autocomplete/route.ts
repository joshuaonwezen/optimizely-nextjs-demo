import { type NextRequest, NextResponse } from "next/server";
import { graphClient } from "@/lib/optimizely/graphClient";
import { AUTOCOMPLETE_QUERY } from "@/lib/graphql/queries/SearchContent";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ tags: [], paths: [] });
  }

  try {
    // No "use cache" boundary: user-typed input must never be cached, or every
    // unique keystroke becomes a permanent cache entry.
    const result = await graphClient().request(AUTOCOMPLETE_QUERY, { value: q });

    return NextResponse.json({
      tags:  result?.ArticlePage?.autocomplete?.tags ?? [],
      paths: result?.SEO?.autocomplete?._metadata?.url?.default ?? [],
    });
  } catch (error) {
    console.error("[Autocomplete] Query failed:", error);
    return NextResponse.json({ error: "Autocomplete failed" }, { status: 500 });
  }
}
