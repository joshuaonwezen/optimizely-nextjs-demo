import { RichText } from "@optimizely/cms-sdk/react/richText";
import { COMPONENT_REGISTRY } from "@/components/cms/ComponentSelector";

interface TraditionalPageProps {
  page: any;
  inEditMode?: boolean;
}

/**
 * Renders a TraditionalPage (_page type).
 *
 * Demonstrates three Optimizely property types:
 *   - string    → heading, subheading
 *   - richText  → body
 *   - content   → featuredBlock (single block reference — the SDK auto-generates
 *                 inline fragments for every registered component type so the full
 *                 block data is fetched and rendered directly, without a separate request)
 *
 * When inEditMode is true, data-epi-* attributes are emitted so
 * communicationinjector.js can open the right property panel on click.
 */
export default function TraditionalPage({ page, inEditMode = false }: TraditionalPageProps) {
  const featuredBlock = page.featuredBlock;
  const FeaturedComponent = featuredBlock?.__typename
    ? COMPONENT_REGISTRY[featuredBlock.__typename]
    : undefined;

  return (
    <div
      className="max-w-4xl mx-auto px-8 py-24"
      data-epi-content-id={inEditMode ? page._metadata?.key : undefined}
    >
      <div className="mb-12">
        {page.heading && (
          <h1
            className="font-display text-4xl md:text-5xl font-extrabold text-on-surface mb-4"
            data-epi-property-name={inEditMode ? "heading" : undefined}
          >
            {page.heading}
          </h1>
        )}
        {page.subheading && (
          <p
            className="text-lg text-on-surface-variant leading-relaxed"
            data-epi-property-name={inEditMode ? "subheading" : undefined}
          >
            {page.subheading}
          </p>
        )}
      </div>

      <div data-epi-property-name={inEditMode ? "body" : undefined}>
        {page.body?.json && (
          <div className="prose text-on-surface-variant leading-relaxed">
            <RichText content={page.body.json} />
          </div>
        )}
        {page.body?.html && !page.body?.json && (
          <div
            className="text-on-surface-variant leading-relaxed"
            dangerouslySetInnerHTML={{ __html: page.body.html }}
          />
        )}
      </div>

      {FeaturedComponent && (
        <div
          className="mt-16 border-t border-outline-variant pt-12"
          data-epi-property-name={inEditMode ? "featuredBlock" : undefined}
        >
          <FeaturedComponent {...featuredBlock} inEditMode={inEditMode} />
        </div>
      )}
    </div>
  );
}
