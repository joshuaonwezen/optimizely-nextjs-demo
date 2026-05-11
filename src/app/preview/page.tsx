export const dynamic = "force-dynamic";

import { GraphClient, type PreviewParams } from "@optimizely/cms-sdk";
import { OptimizelyGridSection } from "@optimizely/cms-sdk/react/server";
import { PreviewComponent } from "@optimizely/cms-sdk/react/client";
import Script from "next/script";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";
import { graphqlFetch } from "@/lib/optimizely/client";
import { COMPONENT_REGISTRY } from "@/components/cms/ComponentSelector";

const GET_SHARED_BLOCK_QUERY = /* GraphQL */ `
  fragment NavItemFields on _IContent {
    ... on NavigationItem {
      __typename
      _metadata { key }
      label
      href { url { default } }
      description
      openInNewTab
      children @recursive(depth: 5)
    }
  }

  query GetSharedBlock($key: String!) {
    _Component(
      where: { _metadata: { key: { eq: $key } } }
      limit: 1
    ) {
      items {
        __typename
        _metadata { key displayName }
        ... on HeroBlock { headline subheadline ctaText ctaLink }
        ... on Hero { heading summary theme }
        ... on CallToAction { label link }
        ... on TextBlock { body { json } }
        ... on ProductCardBlock {
          icon title description linkText
          linkUrl { default }
        }
        ... on ProductHeroBlock {
          badge title description ctaText
          ctaUrl { default }
        }
        ... on FeatureItemBlock { title description }
        ... on SectionHeadingBlock { heading subheading }
        ... on TestimonialBlock { quote authorName authorRole }
        ... on StatsCounterBlock { value label suffix }
        ... on ImageBlock { altText caption }
        ... on FormContainerBlock {
          heading description successMessage
          submitUrl { default }
        }
        ... on Navigation {
          name
          navItems { ...NavItemFields }
        }
      }
    }
  }
`;

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PreviewPage({ searchParams }: Props) {
  initComponentRegistry();

  const params = await searchParams;
  const cmsUrl = process.env.NEXT_PUBLIC_OPTIMIZELY_CMS_URL ?? "";
  const previewToken = typeof params.preview_token === "string" ? params.preview_token : undefined;
  const contentKey = typeof params.key === "string" ? params.key : undefined;
  const inEditMode = params.ctx === "edit";

  const client = new GraphClient(process.env.OPTIMIZELY_GRAPH_SINGLE_KEY!, {
    graphUrl: process.env.OPTIMIZELY_GRAPH_GATEWAY,
  });

  let sdkItem: any = null;
  let nodes: any[] = [];
  try {
    sdkItem = await client.getPreviewContent(params as PreviewParams);
    nodes = sdkItem?.composition?.nodes ?? [];
  } catch {
    // getPreviewContent can fail for shared blocks whose component fields don't
    // match the SDK's generated query (e.g. ContentReference fields queried as
    // scalars). Fall through to the _Component query below.
  }

  const shell = (children: React.ReactNode) => (
    <>
      <Script
        src={`${cmsUrl}/util/javascript/communicationinjector.js`}
        strategy="afterInteractive"
      />
      <PreviewComponent />
      {children}
    </>
  );

  // Primary path: page / experience with a composition (unchanged)
  if (nodes.length > 0) {
    return shell(
      nodes.map((node: any) =>
        node.nodeType === "section" ? (
          <div key={node.key} data-epi-block-id={node.key}>
            <OptimizelyGridSection nodes={node.nodes ?? []} />
          </div>
        ) : (
          <OptimizelyGridSection key={node.key} nodes={[node]} />
        )
      )
    );
  }

  // SDK path: shared block — getPreviewContent returns the item directly (no composition)
  // This uses the preview_token + ver params so it fetches the correct draft version.
  if (sdkItem?.__typename) {
    const Component = COMPONENT_REGISTRY[sdkItem.__typename];

    if (Component) {
      const { __typename: _t, composition: _c, ...props } = sdkItem;
      return shell(
        <div data-epi-block-id={inEditMode ? contentKey : undefined}>
          <Component {...props} inEditMode={inEditMode} previewToken={previewToken} />
        </div>
      );
    }

    // No registered renderer — labelled placeholder so the CMS overlay still works
    return shell(
      <div
        data-epi-block-id={inEditMode ? contentKey : undefined}
        className="m-8 rounded-xl border border-ghost-border bg-surface-low p-8 text-center"
      >
        <p className="text-sm font-mono text-on-surface-variant mb-1">{sdkItem.__typename}</p>
        <p className="text-lg font-semibold text-on-surface">
          {sdkItem._metadata?.displayName ?? contentKey}
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">
          No visual preview available for this block type.
        </p>
      </div>
    );
  }

  // Final fallback: SDK failed entirely — query Graph directly by content key
  if (contentKey) {
    const result = await graphqlFetch<any>(
      GET_SHARED_BLOCK_QUERY,
      { key: contentKey },
      { previewToken, cache: "no-store" }
    );
    const blockItem = result.data?._Component?.items?.[0];

    if (blockItem) {
      const Component = COMPONENT_REGISTRY[blockItem.__typename];

      if (Component) {
        const { _metadata: _m, __typename: _t, ...props } = blockItem;
        return shell(
          <div data-epi-block-id={inEditMode ? contentKey : undefined}>
            <Component {...props} _metadata={blockItem._metadata} inEditMode={inEditMode} previewToken={previewToken} />
          </div>
        );
      }

      // No registered renderer — show a labelled placeholder so the CMS overlay still works
      return shell(
        <div
          data-epi-block-id={inEditMode ? contentKey : undefined}
          className="m-8 rounded-xl border border-ghost-border bg-surface-low p-8 text-center"
        >
          <p className="text-sm font-mono text-on-surface-variant mb-1">{blockItem.__typename}</p>
          <p className="text-lg font-semibold text-on-surface">
            {blockItem._metadata?.displayName ?? contentKey}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            No visual preview available for this block type.
          </p>
        </div>
      );
    }
  }

  return shell(null);
}
