import { type NextRequest, NextResponse } from "next/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { AUTOCOMPLETE_QUERY } from "@/lib/graphql/queries/SearchContent";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ tags: [], paths: [] });
  }

  try {
    const result = await graphqlFetch<any>(AUTOCOMPLETE_QUERY, { value: q }, { cache: "no-store" });

    return NextResponse.json({
      tags:  result.data?.ArticlePage?.autocomplete?.tags ?? [],
      paths: result.data?._Content?.autocomplete?._metadata?.url?.default ?? [],
    });
  } catch (error) {
    console.error("[Autocomplete] Query failed:", error);
    return NextResponse.json({ error: "Autocomplete failed" }, { status: 500 });
  }
}
