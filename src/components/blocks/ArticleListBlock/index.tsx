import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import ArticleCard from "@/components/articles/ArticleCard";
import { getArticles } from "@/lib/graphql/queries/GetArticles";
import { getTaxonomyTerms } from "@/lib/graphql/queries/GetTaxonomyTerms";
import { expandToUris, LEGACY_CATEGORY_MAP } from "@/lib/taxonomy";
import { columnsClass, resolveStyleClasses, spacingClass, widthClass } from "../_shared/displayTemplateSettings";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Content type + display template: src/lib/optimizely/productLandingTypes.mjs
// (personal instance only, kept out of the opti:push glob on purpose).

const DEFAULT_LIMIT = 3;

interface ArticleListData {
  heading?: string | null;
  subheading?: string | null;
  category?: string | null;
  limit?: number | null;
  layout?: string | null;
}

type ArticleListBlockProps = ArticleListData & {
  content?: ArticleListData;
  displaySettings?: Record<string, string | boolean>;
};

export default async function ArticleListBlock(props: ArticleListBlockProps) {
  const data: ArticleListData = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const ds = props.displaySettings;
  const style = resolveStyleClasses(ds, { background: "transparent" });

  // The category enum still uses the legacy slugs; filter on the matching taxonomy
  // term and its descendants, since content is tagged with leaf terms only.
  const { terms } = await getTaxonomyTerms();
  const termKey = data.category ? LEGACY_CATEGORY_MAP[data.category] : undefined;
  const categoryUris = termKey ? expandToUris(terms, [termKey]) : null;
  // facets: false - this block renders items only, so skip the aggregation.
  const { items } = await getArticles({
    limit: data.limit ?? DEFAULT_LIMIT,
    category: categoryUris,
    facets: false,
  });

  const isList = data.layout === "list";

  return (
    <section
      data-component="ArticleListBlock"
      data-track-view="ArticleListBlock"
      className={`${style.wrapper} ${spacingClass(ds, "py-16")}`}
    >
      <div className={`${widthClass(ds, "max-w-6xl")} mx-auto px-8`}>
        <BlockHeader
          heading={data.heading}
          subheading={data.subheading}
          pa={pa}
          style={style}
          headingSize={style.heading}
          align={style.align}
          subheadingClassName="text-base mb-8"
        />
        {items.length > 0 ? (
          <div className={isList ? "space-y-3" : `grid gap-4 ${columnsClass(ds, "sm:grid-cols-2 lg:grid-cols-3")}`}>
            {items.map((item, i) => (
              <ArticleCard key={item._metadata?.url?.default ?? i} item={item} terms={terms} />
            ))}
          </div>
        ) : (
          <p className={`text-sm ${style.textMuted}`}>No articles to show yet.</p>
        )}
      </div>
    </section>
  );
}
