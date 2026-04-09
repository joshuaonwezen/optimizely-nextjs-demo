import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { graphqlFetch } from "@/lib/optimizely/client";
import {
  ComponentSelector,
  type CompositionRow,
} from "@/components/cms/ComponentSelector";

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

  const rows: CompositionRow[] = [];

  return (
    <div className="max-w-7xl mx-auto px-8 py-24">
      <h1 className="font-display text-4xl font-extrabold mb-4 text-on-surface">
        {page._metadata.displayName}
      </h1>
      <p className="text-sm text-on-surface-variant">
        Key: {page._metadata.key}
      </p>
      <ComponentSelector rows={rows} inEditMode={false} />
    </div>
  );
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
