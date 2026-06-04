import Image from "next/image";
import Link from "next/link";
import { RichText, type RichTextProps } from "@optimizely/cms-sdk/react/richText";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { AUTHOR_FRAGMENT } from "@/components/blocks/AuthorBlock/fragment";

interface ImageRef {
  _metadata?: { url?: { default?: string | null } | null } | null;
}

interface AuthorData {
  name?: string | null;
  role?: string | null;
  avatar?: ImageRef | null;
  linkedinUrl?: string | null;
}

// The page query passes the author contentReference through; depending on
// whether the data arrives via inline composition or via Graph, the key sits
// in either `key` directly or under `_metadata.key`.
interface AuthorRef {
  key?: string | null;
  _metadata?: { key?: string | null; displayName?: string | null } | null;
}

interface RelatedRef {
  _metadata?: {
    key?: string | null;
    displayName?: string | null;
    url?: { default?: string | null } | null;
  } | null;
  title?: string | null;
  summary?: string | null;
  category?: string | null;
}

interface ArticleContent {
  _metadata?: { key?: string | null; displayName?: string | null } | null;
  title?: string | null;
  summary?: string | null;
  heroImage?: ImageRef | null;
  body?: { json?: unknown; html?: string | null } | null;
  author?: AuthorRef | null;
  publishDate?: string | null;
  category?: string | null;
  tags?: string[] | null;
  relatedArticles?: RelatedRef[] | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  "personal-finance": "Personal Finance",
  "business-banking": "Business Banking",
  "investments": "Investments",
  "market-insights": "Market Insights",
};

const AUTHOR_BY_KEY_QUERY = /* GraphQL */ `
  query AuthorByKey($key: String!) {
    AuthorBlock(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
      items {
        ...AuthorBlockData
      }
    }
  }
  ${AUTHOR_FRAGMENT}
`;

async function loadAuthor(key: string | null | undefined): Promise<AuthorData | null> {
  if (!key) return null;
  const res = await graphqlFetch<{ AuthorBlock?: { items?: AuthorData[] } }>(
    AUTHOR_BY_KEY_QUERY,
    { key },
    { next: { revalidate: 300 } }
  );
  return res.data?.AuthorBlock?.items?.[0] ?? null;
}

function formatDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ArticlePage({ content }: { content: ArticleContent }) {
  const { pa } = getPreviewUtils(content as any);

  const heroUrl = content.heroImage?._metadata?.url?.default ?? null;
  const authorKey = content.author?.key ?? content.author?._metadata?.key ?? null;
  const author = await loadAuthor(authorKey);
  const formattedDate = formatDate(content.publishDate);
  const categoryLabel = content.category ? CATEGORY_LABEL[content.category] ?? content.category : null;
  const tags = (content.tags ?? []).filter(Boolean);
  const related = (content.relatedArticles ?? []).filter((r) => r?._metadata?.url?.default);

  return (
    <article className="max-w-3xl mx-auto px-8 pt-16 pb-24">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-6">
          {categoryLabel && (
            <Link
              href={`/en/insights/?category=${content.category}`}
              className="text-brand hover:opacity-80"
            >
              {categoryLabel}
            </Link>
          )}
          {formattedDate && (
            <>
              {categoryLabel && <span>·</span>}
              <time dateTime={content.publishDate ?? undefined}>{formattedDate}</time>
            </>
          )}
        </div>

        {content.title && (
          <h1
            {...pa("title")}
            className="font-display text-4xl md:text-5xl font-extrabold text-on-surface leading-tight mb-6"
          >
            {content.title}
          </h1>
        )}

        {content.summary && (
          <p
            {...pa("summary")}
            className="text-xl text-on-surface-variant leading-relaxed"
          >
            {content.summary}
          </p>
        )}

        {author && (
          <div className="flex items-center gap-3 mt-8 pt-8 border-t border-ghost-border">
            {author.avatar?._metadata?.url?.default && (
              <Image
                src={author.avatar._metadata.url.default}
                alt={author.name ?? ""}
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            )}
            <div>
              {author.name && (
                <p className="text-sm font-semibold text-on-surface">{author.name}</p>
              )}
              {author.role && (
                <p className="text-xs text-on-surface-variant">{author.role}</p>
              )}
            </div>
          </div>
        )}
      </header>

      {heroUrl && (
        <div {...pa("heroImage")} className="relative w-full aspect-[16/9] mb-12 rounded-2xl overflow-hidden">
          <Image
            src={heroUrl}
            alt={content.title ?? ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>
      )}

      <div {...pa("body")} className="prose text-on-surface-variant leading-relaxed space-y-6 mb-12">
        {content.body?.json ? (
          <RichText content={content.body.json as RichTextProps["content"]} />
        ) : content.body?.html ? (
          <div dangerouslySetInnerHTML={{ __html: content.body.html }} />
        ) : null}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-8 border-t border-ghost-border mb-12">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant mr-2 self-center">Tags</span>
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/en/insights/?tag=${encodeURIComponent(tag)}`}
              className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-low text-on-surface hover:bg-surface-container transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-ghost-border">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-6">Related articles</h2>
          <ul className="space-y-4">
            {related.map((article, i) => {
              const url = article._metadata?.url?.default ?? "#";
              const title = article.title ?? article._metadata?.displayName ?? "Untitled";
              return (
                <li key={i}>
                  <Link
                    href={url}
                    className="block rounded-2xl bg-surface-lowest border border-ghost-border p-6 hover-ambient transition-shadow"
                  >
                    <p className="font-display text-lg font-bold text-on-surface mb-1">{title}</p>
                    {article.summary && (
                      <p className="text-sm text-on-surface-variant">{article.summary}</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
