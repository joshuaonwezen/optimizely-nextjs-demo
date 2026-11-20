import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import type { CategoryBranch } from "@/lib/taxonomy";

// One root field per listing that shows rolled-up counts. Each must keep the
// arguments of that listing's own query (CategoriesDemo's BROWSE_QUERY,
// GetArticles' GET_ARTICLES_QUERY), or a parent's count stops matching what
// clicking it returns.
const SCOPES = {
  content: (v: string) =>
    `_Content(limit: 0, locale: en, where: { _itemMetadata: { categories: { in: ${v} } }, _metadata: { url: { default: { exist: true } } } })`,
  articles: (v: string) =>
    `ArticlePage(limit: 0, where: { _metadata: { url: { default: { exist: true } } }, _itemMetadata: { categories: { in: ${v} } } })`,
};

export type CategoryTotalsScope = keyof typeof SCOPES;

// One aliased root field per branch, so every count comes back in one request.
function buildQuery(scope: CategoryTotalsScope, count: number): string {
  const indexes = Array.from({ length: count }, (_, i) => i);
  const vars = indexes.map((i) => `$b${i}: [String]`).join(", ");
  const fields = indexes.map((i) => `  b${i}: ${SCOPES[scope](`$b${i}`)} { total }`).join("\n");
  return `query CategoryTotals(${vars}) {\n${fields}\n}`;
}

/**
 * Distinct items per branch, keyed by term key: what rollUpCounts() takes as
 * `totals`. Branches come from overlappingBranches(), so only the rows whose
 * summed count could overcount cost a lookup.
 */
export async function getCategoryTotals(
  scope: CategoryTotalsScope,
  branches: CategoryBranch[]
): Promise<Record<string, number>> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  if (branches.length === 0) return {};
  try {
    const res: Record<string, { total?: number | null } | null | undefined> =
      await graphClient().request(
        buildQuery(scope, branches.length),
        Object.fromEntries(branches.map((branch, i) => [`b${i}`, branch.uris]))
      );
    const totals: Record<string, number> = {};
    branches.forEach((branch, i) => {
      const total = res[`b${i}`]?.total;
      if (typeof total === "number") totals[branch.key] = total;
    });
    return totals;
  } catch (error) {
    return cachedQueryFailed("getCategoryTotals", error);
  }
}
