"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ArticleCard from "@/components/articles/ArticleCard";
import type { ArticleListItem } from "@/lib/graphql/queries/GetArticles";
import type { TaxonomyTermMeta } from "@/lib/taxonomy";

// Fetches the personalized items in the BROWSER, on purpose.
//
// Reading the visitor profile on the server would make every CMS page carrying this
// block dynamic, and today only "/" is. An editor can drop this block anywhere, so the
// block must not be able to take a page out of ISR. Same pattern as the search and
// branch-finder widgets.

type Source = "readCategories" | "odp" | "persona" | "latest";

type Response = {
  items: ArticleListItem[];
  source: Source;
  categories: string[];
  signals: { readCategories: string[]; odpSegments: string[]; persona: string };
};

const SOURCE_LABEL: Record<Source, string> = {
  readCategories: "Based on the categories you read",
  odp: "Based on your Data Platform audience",
  persona: "Based on the section you are browsing",
  latest: "Latest articles",
};

export default function RecommendationBlockClient({
  limit,
  terms,
  columnsClassName,
  mutedClassName,
  showReason,
}: {
  limit: number;
  terms: TaxonomyTermMeta[];
  columnsClassName: string;
  mutedClassName: string;
  showReason: boolean;
}) {
  const pathname = usePathname();
  const [data, setData] = useState<Response | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ limit: String(limit) });
    // Never recommend the page being read.
    if (pathname) params.set("exclude", pathname);

    fetch(`/api/personalization/recommendations?${params}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Response>) : null))
      .then((next) => {
        if (cancelled) return;
        if (next) setData(next);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, pathname]);

  if (failed) return null;

  if (!data) {
    return (
      <div className={`grid gap-4 ${columnsClassName}`} aria-hidden>
        {Array.from({ length: limit }).map((_, i) => (
          <div
            key={i}
            className="h-36 rounded-2xl border border-ghost-border bg-surface-low animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.items.length === 0) return null;

  return (
    <>
      {showReason && (
        <p className={`text-xs mb-4 ${mutedClassName}`}>{SOURCE_LABEL[data.source]}</p>
      )}
      <div className={`grid gap-4 ${columnsClassName}`}>
        {data.items.map((item, i) => (
          <ArticleCard key={item._metadata?.url?.default ?? i} item={item} terms={terms} />
        ))}
      </div>
    </>
  );
}
