import Image from "next/image";
import { getClient } from "@optimizely/cms-sdk";
import { RichText } from "@optimizely/cms-sdk/react/richText";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { graphqlFetch, CACHE_TTL } from "@/lib/optimizely/client";

const FEATURED_BLOCK_KEY_QUERY = /* GraphQL */ `
  query FeaturedBlockKey($key: String!) {
    TraditionalPage(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
      items { featuredBlock { _metadata { key } } }
    }
  }
`;

export default async function TraditionalPage({ content }: { content: any }) {
  const { pa, src } = getPreviewUtils(content);
  const heroUrl = src(content.heroImage as any) ?? content.heroImage?.url?.default ?? content.heroImage?._metadata?.url?.default ?? null;

  // Graph returns only base metadata for single type:"content" references and
  // never inline-expands them. When the referenced type is a _component, the
  // SDK's generated page query omits even _metadata (it skips the interface
  // fragment for main base types), so the page query gives us only __typename.
  // Resolve the reference key with a targeted query on this page, then fetch
  // the full item by key so OptimizelyComponent can dispatch it correctly.
  const isBaseMeta = (b: { __typename?: string } | null | undefined) =>
    b?.__typename === "_Content" || b?.__typename === "_Component";
  let featuredBlock = content.featuredBlock ?? null;
  if (isBaseMeta(featuredBlock)) {
    let blockKey = featuredBlock?._metadata?.key as string | undefined;
    if (!blockKey && content?._metadata?.key) {
      const { data } = await graphqlFetch<{
        TraditionalPage?: { items?: Array<{ featuredBlock?: { _metadata?: { key?: string } } }> };
      }>(
        FEATURED_BLOCK_KEY_QUERY,
        { key: content._metadata.key },
        { next: { revalidate: CACHE_TTL, tags: ["page"] } }
      );
      blockKey = data?.TraditionalPage?.items?.[0]?.featuredBlock?._metadata?.key;
    }
    featuredBlock = blockKey
      ? await getClient()
          .getContent({ key: blockKey }, { next: { revalidate: CACHE_TTL } } as any)
          .catch(() => null)
      : null;
  }

  // Free content area: an array of type:"content" blocks, inline-expanded by Graph,
  // so each item arrives fully typed and dispatches through OptimizelyComponent directly.
  const mainContent: any[] = (content.mainContent ?? []).filter(Boolean);

  return (
    <div data-component="TraditionalPage" className="max-w-4xl mx-auto px-8 py-24">
      {heroUrl && (
        <div {...pa("heroImage")} className="relative w-full aspect-[16/9] mb-12 rounded-2xl overflow-hidden">
          <Image
            src={heroUrl}
            alt={content.heading ?? ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
        </div>
      )}
      <div className="mb-12">
        {content.heading && (
          <h1
            className="font-display text-4xl md:text-5xl font-extrabold text-on-surface mb-4"
            {...pa("heading")}
          >
            {content.heading}
          </h1>
        )}
        {content.subheading && (
          <p
            className="text-lg text-on-surface-variant leading-relaxed"
            {...pa("subheading")}
          >
            {content.subheading}
          </p>
        )}
      </div>

      <div {...pa("body")}>
        {content.body?.json && (
          <div className="richtext">
            <RichText content={content.body.json} />
          </div>
        )}
        {content.body?.html && !content.body?.json && (
          <div
            className="richtext"
            dangerouslySetInnerHTML={{ __html: content.body.html }}
          />
        )}
      </div>

      {mainContent.length > 0 && (
        <div {...pa("mainContent")} className="mt-12 space-y-8">
          {mainContent.map((item, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={item} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}

      {featuredBlock && !isBaseMeta(featuredBlock) && (
        <div
          className="mt-16 border-t border-outline-variant pt-12"
          {...pa("featuredBlock")}
        >
          <BlockErrorBoundary>
            <OptimizelyComponent content={featuredBlock} />
          </BlockErrorBoundary>
        </div>
      )}
    </div>
  );
}
