import { RichText } from "@optimizely/cms-sdk/react/richText";
import { COMPONENT_REGISTRY } from "@/components/cms/ComponentSelector";

interface TraditionalPageProps {
  page: any;
  inEditMode?: boolean;
}

/**
 * Renders a TraditionalPage (_page type).
 *
 * Demonstrates three Optimizely property types in one page:
 *   - string    → heading, subheading
 *   - richText  → body
 *   - content   → relatedContent (content area — a list of blocks)
 *
 * When inEditMode is true, data-epi-* attributes are emitted so
 * the CMS communicationinjector.js can open the right property panel
 * when an editor clicks a field.
 */
export default function TraditionalPage({ page, inEditMode = false }: TraditionalPageProps) {
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

      {page.relatedContent && page.relatedContent.length > 0 && (
        <div
          className="mt-16 border-t border-outline-variant pt-12"
          data-epi-property-name={inEditMode ? "relatedContent" : undefined}
        >
          <h2 className="font-display text-2xl font-bold text-on-surface mb-8">
            Related Content
          </h2>
          {page.relatedContent.map((item: any, i: number) => {
            const Component = COMPONENT_REGISTRY[item.__typename];
            if (!Component) return null;
            const key = item._metadata?.key ?? `related-${i}`;
            return (
              <div
                key={key}
                data-epi-content-id={inEditMode ? key : undefined}
              >
                <Component {...item} inEditMode={inEditMode} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
