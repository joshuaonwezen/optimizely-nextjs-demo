import Image from "next/image";
import { getClient } from "@optimizely/cms-sdk";
import { RichText } from "@optimizely/cms-sdk/react/richText";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";

export default async function TraditionalPage({ content }: { content: any }) {
  const { pa } = getPreviewUtils(content);
  const heroUrl = content.heroImage?._metadata?.url?.default ?? null;

  // Graph returns only base metadata for single type:"content" references.
  // When featuredBlock comes back as _Content (no inline expansion), fetch
  // the full item by key so OptimizelyComponent can dispatch it correctly.
  let featuredBlock = content.featuredBlock ?? null;
  if (featuredBlock?.__typename === "_Content" && featuredBlock?._metadata?.key) {
    featuredBlock = await getClient()
      .getContent({ key: featuredBlock._metadata.key }, { next: { revalidate: 60 } } as any)
      .catch(() => null);
  }

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
          <div className="prose text-on-surface-variant leading-relaxed">
            <RichText content={content.body.json} />
          </div>
        )}
        {content.body?.html && !content.body?.json && (
          <div
            className="text-on-surface-variant leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.body.html }}
          />
        )}
      </div>

      {featuredBlock && featuredBlock.__typename !== "_Content" && (
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
