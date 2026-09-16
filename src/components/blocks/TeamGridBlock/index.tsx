import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { graphClient } from "@/lib/optimizely/graphClient";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { extractKey, type ContentRef, type ImageRef } from "../_shared/contentRefs";

export const TeamGridBlockType = contentType({
  key: "TeamGridBlock",
  displayName: "Team Grid",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", isLocalized: true },
    members:    {
      type: "array",
      displayName: "Members",
      items: { type: "contentReference", allowedTypes: [TeamMemberBlockType] },
    },
  },
});

export const TeamGridBlockDefaultTemplate = displayTemplate({
  key: "TeamGridBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "TeamGridBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface MemberData {
  __typename?: string;
  _metadata?: { key?: string | null } | null;
  name?: string | null;
  role?: string | null;
  bio?:  string | null;
  linkedinUrl?: string | null;
  photo?: ImageRef;
}

interface TeamGridData {
  heading?:    string | null;
  subheading?: string | null;
  // contentReference arrays arrive in three shapes - see ContentRef.
  members?:    Array<ContentRef | null> | null;
  __context?: { edit?: boolean } | null;
}

type TeamGridBlockProps = TeamGridData & {
  content?: TeamGridData;
  displaySettings?: Record<string, string | boolean>;
};

// One batched query for every member, not one getContent() per key: a 10-member
// grid was 10 sequential round-trips, each with its own cache entry keyed on a
// single member key.
const MEMBERS_BY_KEYS_QUERY = /* GraphQL */ `
  query TeamMembersByKeys($keys: [String!]) {
    TeamMemberBlock(where: { _metadata: { key: { in: $keys } } }, limit: 100) {
      items {
        _metadata { key types displayName locale }
        name
        role
        bio
        linkedinUrl { default }
        photo { key url { default } }
      }
    }
  }
`;

type MembersResult = { TeamMemberBlock?: { items?: MemberData[] } };

async function fetchMembers(keys: string[]): Promise<MembersResult> {
  "use cache";
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(MEMBERS_BY_KEYS_QUERY, { keys });
  } catch (error) {
    return cachedQueryFailed("fetchMembers", error);
  }
}

async function loadMembers(keys: string[]): Promise<MemberData[]> {
  if (keys.length === 0) return [];
  const res = await fetchMembers(keys);
  const items = res?.TeamMemberBlock?.items ?? [];

  // Graph returns one document per locale, so keep the first of each key, then
  // map back over `keys` to preserve the editor's display order - the query
  // itself gives no ordering guarantee.
  const byKey = new Map<string, MemberData>();
  for (const item of items) {
    const k = item?._metadata?.key;
    if (k && !byKey.has(k)) byKey.set(k, item);
  }
  return keys.map((k) => byKey.get(k)).filter((m): m is MemberData => Boolean(m));
}

export default async function TeamGridBlock(props: TeamGridBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const style = resolveStyleClasses(props.displaySettings, { background: "transparent" });

  const keys = (data.members ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const members = await loadMembers(keys);

  return (
    <section data-component="TeamGridBlock" className={`py-20 max-w-7xl mx-auto px-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}>
      <div className="text-center mb-12 max-w-2xl mx-auto">
        {data.heading && (
          <h2 {...pa("heading")} className={`${style.font} text-3xl md:text-4xl font-extrabold ${style.text} mb-3`}>
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p {...pa("subheading")} className={`text-base ${style.textMuted}`}>
            {data.subheading}
          </p>
        )}
      </div>
      {members.length > 0 && (
        <div {...pa("members")} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {members.map((m, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={m as any} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}
