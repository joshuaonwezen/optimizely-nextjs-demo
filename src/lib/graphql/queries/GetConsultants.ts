import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { graphClient } from "@/lib/optimizely/graphClient";
import type { ImageRef } from "@/components/blocks/_shared/contentRefs";

export interface ConsultantListItem {
  name?: string | null;
  jobTitle?: string | null;
  summary?: string | null;
  photo?: ImageRef | null;
  _metadata?: {
    key?: string | null;
    url?: { default?: string | null } | null;
  } | null;
}

interface GetConsultantsResult {
  ConsultantPage?: { items?: ConsultantListItem[] } | null;
}

const GET_CONSULTANTS_QUERY = /* GraphQL */ `
  query GetConsultants {
    ConsultantPage(limit: 100, orderBy: { name: ASC }) {
      items {
        name
        jobTitle
        summary
        photo { key url { default } }
        _metadata { key url { default } }
      }
    }
  }
`;

async function fetchConsultants(): Promise<GetConsultantsResult> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(GET_CONSULTANTS_QUERY, {});
  } catch (error) {
    return cachedQueryFailed("fetchConsultants", error);
  }
}

export async function getConsultants(): Promise<ConsultantListItem[]> {
  const result = await fetchConsultants();
  return result?.ConsultantPage?.items ?? [];
}
