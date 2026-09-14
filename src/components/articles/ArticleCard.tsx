import type { ArticleListItem } from "@/lib/graphql/queries/GetArticles";
import { termLabel, type TaxonomyTermMeta } from "@/lib/taxonomy";

// Shared by the /demo/listing page and ArticleListBlock.
export default function ArticleCard({ item, terms }: { item: ArticleListItem; terms: TaxonomyTermMeta[] }) {
  const url = item._metadata?.url?.default ?? "#";
  const categoryLabel = item.categoryUris.length
    ? termLabel(terms, item.categoryUris[0])
    : null;
  const date = item._metadata?.published
    ? new Date(item._metadata.published).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
    : null;
  return (
    <a
      data-component="ArticleCard"
      href={url}
      className="block bg-surface-lowest border border-ghost-border rounded-2xl p-5 hover:border-brand/40 transition-colors"
    >
      {categoryLabel && (
        <span className="text-xs font-semibold text-brand mb-2 block">{categoryLabel}</span>
      )}
      <p className="font-display text-sm font-bold text-on-surface mb-2 line-clamp-2 leading-snug">
        {item.title ?? "Untitled"}
      </p>
      {item.summary && (
        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">{item.summary}</p>
      )}
      {date && (
        <p className="text-xs text-on-surface-variant mt-3 opacity-60">{date}</p>
      )}
    </a>
  );
}
