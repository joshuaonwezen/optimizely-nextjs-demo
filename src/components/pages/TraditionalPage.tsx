import Image from "next/image";
import { RichText } from "@optimizely/cms-sdk/react/richText";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";

export default function TraditionalPage({ content }: { content: any }) {
  const { pa, src } = getPreviewUtils(content);
  const heroUrl = src(content.heroImage as any) ?? content.heroImage?.url?.default ?? content.heroImage?._metadata?.url?.default ?? null;

  // featuredBlock is a single type:"content" reference. Graph inline-expands it -
  // the SDK's generated page query includes a fragment for every allowed component
  // type, so it arrives fully typed (e.g. as FaqContainerBlock) and dispatches
  // straight through OptimizelyComponent. No self-fetch. Render it only when set:
  // an unset field comes back as a bare _Content/_Component stub with no concrete type.
  const featuredBlock = content.featuredBlock ?? null;
  const hasFeaturedBlock =
    featuredBlock &&
    featuredBlock.__typename !== "_Content" &&
    featuredBlock.__typename !== "_Component";

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

      {hasFeaturedBlock && (
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
