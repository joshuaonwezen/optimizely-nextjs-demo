import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { graphqlFetch } from "@/lib/optimizely/client";
import { ComponentSelector } from "@/components/cms/ComponentSelector";
import { extractRowsFromComposition } from "@/lib/optimizely/extractRows";

const GET_LANDING_PAGE_QUERY = /* GraphQL */ `
  query GetLandingPage($slug: String!) {
    LandingPage(
      where: { _metadata: { url: { default: { endsWith: $slug } } } }
      limit: 1
    ) {
      items {
        _metadata {
          key
          displayName
          url { default }
          published
        }
        composition {
          grids: nodes {
            ... on CompositionStructureNode {
              key
              type
              displaySettings { key value }
              component { __typename ... on _Component { _json } }
              nodes {
                ... on CompositionStructureNode {
                  key
                  type
                  displaySettings { key value }
                  component { __typename ... on _Component { _json } }
                  nodes {
                    ... on CompositionElementNode {
                      key
                      type
                      displaySettings { key value }
                      displayTemplateKey
                      component {
                        __typename
                        ... on _Component { _json }
                      }
                    }
                  }
                }
                ... on CompositionElementNode {
                  key
                  type
                  displaySettings { key value }
                  displayTemplateKey
                  component {
                    __typename
                    ... on _Component { _json }
                  }
                }
              }
            }
            ... on CompositionElementNode {
              key
              type
              displaySettings { key value }
              displayTemplateKey
              component {
                __typename
                ... on _Component { _json }
              }
            }
          }
        }
      }
    }
  }
`;

export default async function LandingPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const result = await graphqlFetch<any>(
    GET_LANDING_PAGE_QUERY,
    { slug: `/${slug}/` },
    { next: { revalidate: 60 } }
  );

  const page = result.data?.LandingPage?.items?.[0];

  if (!page) return notFound();

  const rows = extractRowsFromComposition(page);

  return <ComponentSelector rows={rows} inEditMode={false} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const result = await graphqlFetch<any>(
    GET_LANDING_PAGE_QUERY,
    { slug: `/${slug}/` },
    { next: { revalidate: 300 } }
  );

  const page = result.data?.LandingPage?.items?.[0];

  return {
    title: page?._metadata?.displayName ?? "Landing Page",
  };
}
