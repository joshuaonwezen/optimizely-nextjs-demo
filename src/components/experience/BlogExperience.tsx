import Image from "next/image";
import { getClient } from "@optimizely/cms-sdk";
import {
  OptimizelyComposition,
  getPreviewUtils,
  type ComponentContainerProps,
} from "@optimizely/cms-sdk/react/server";
import { CACHE_TTL } from "@/lib/optimizely/client";

function ComponentWrapper({ children, node }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  return <div {...pa(node)}>{children}</div>;
}

function formatDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogExperience({ content }: { content: any }) {
  const { pa, src } = getPreviewUtils(content);

  const heroUrl =
    src(content?.heroImage) ??
    content?.heroImage?.url?.default ??
    content?.heroImage?._metadata?.url?.default ??
    null;

  // Author is a single "content" property. An inline item arrives fully expanded
  // (__typename AuthorBlock, name set, key null); a reference to an existing
  // AuthorBlock arrives as base metadata only (__typename _Content) and must be
  // resolved by key. Handle both.
  let author: any = content?.author ?? null;
  const authorKey = author?.key ?? author?._metadata?.key ?? null;
  if (author && !author.name && authorKey) {
    author = await getClient()
      .getContent({ key: authorKey }, { next: { revalidate: CACHE_TTL } } as any)
      .catch(() => null);
  }
  const authorName = author?.name ?? null;
  const authorRole = author?.role ?? null;
  const authorAvatarUrl =
    author?.avatar?.url?.default ?? author?.avatar?._metadata?.url?.default ?? null;

  const formattedDate = formatDate(content?.publishedDate);
  const nodes: any[] = content?.composition?.nodes ?? [];

  return (
    <div data-component="BlogExperience">
      {heroUrl && (
        <div
          {...pa("heroImage")}
          className="relative w-full max-w-4xl mx-auto aspect-[16/9] mt-8 mb-4 rounded-2xl overflow-hidden"
        >
          <Image
            src={heroUrl}
            alt={content?.heading ?? ""}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
          />
        </div>
      )}

      <header className="max-w-3xl mx-auto px-8 pt-4 pb-8">
        {content?.heading && (
          <h1
            {...pa("heading")}
            className="font-display text-4xl md:text-5xl font-extrabold text-on-surface leading-tight mb-4"
          >
            {content.heading}
          </h1>
        )}

        {content?.subheading && (
          <p {...pa("subheading")} className="text-xl text-on-surface-variant leading-relaxed">
            {content.subheading}
          </p>
        )}

        <div className="flex items-center gap-4 mt-8 pt-8 border-t border-ghost-border">
          {(authorName || authorRole) && (
            <div {...pa("author")} className="flex items-center gap-3">
              {authorAvatarUrl && (
                <Image
                  src={authorAvatarUrl}
                  alt={authorName ?? ""}
                  width={40}
                  height={40}
                  className="rounded-full object-cover flex-shrink-0"
                />
              )}
              <div className="leading-tight">
                {authorName && (
                  <p className="text-sm font-semibold text-on-surface">{authorName}</p>
                )}
                {authorRole && (
                  <p className="text-xs text-on-surface-variant">{authorRole}</p>
                )}
              </div>
            </div>
          )}
          {(authorName || authorRole) && formattedDate && (
            <span className="text-on-surface-variant">·</span>
          )}
          {formattedDate && (
            <time
              dateTime={content?.publishedDate ?? undefined}
              className="text-sm text-on-surface-variant"
            >
              {formattedDate}
            </time>
          )}
        </div>
      </header>

      <OptimizelyComposition nodes={nodes} ComponentWrapper={ComponentWrapper} />
    </div>
  );
}
