import { graphqlFetch } from "@/lib/optimizely/client";

interface SiteBannerItem {
  message?: string | null;
  enabled?: boolean | null;
  variant?: string | null;
  linkText?: string | null;
  linkUrl?: string | null;
}

interface GetSiteBannerResult {
  SiteBanner?: {
    items?: Array<SiteBannerItem | null> | null;
  } | null;
}

const GET_SITE_BANNER_QUERY = /* GraphQL */ `
  query GetSiteBanner {
    SiteBanner(limit: 1, where: { enabled: { eq: true } }) {
      items {
        message
        enabled
        variant
        linkText
        linkUrl
      }
    }
  }
`;

export async function getSiteBanner(): Promise<SiteBannerItem | null> {
  try {
    const result = await graphqlFetch<GetSiteBannerResult>(
      GET_SITE_BANNER_QUERY,
      {},
      { next: { revalidate: 60, tags: ["banner"] } }
    );
    return result.data?.SiteBanner?.items?.[0] ?? null;
  } catch {
    return null;
  }
}
