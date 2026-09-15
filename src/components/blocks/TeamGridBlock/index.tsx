import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { cacheLife, cacheTag } from "next/cache";
import { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { CACHE_TTL } from "@/lib/optimizely/client";
import { graphClient } from "@/lib/optimizely/graphClient";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";

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

// See TimelineBlock for the three shapes Graph returns for contentReference
// arrays. extractKey unifies them.
type MemberRef =
  | string
  | { key?: string | null; _metadata?: { key?: string | null } | null };

interface MemberData {
  __typename?: string;
  _metadata?: { key?: string | null } | null;
  name?: string | null;
  role?: string | null;
  bio?:  string | null;
  linkedinUrl?: string | null;
  photo?: { _metadata?: { url?: { default?: string | null } | null } | null } | null;
}

interface TeamGridData {
  heading?:    string | null;
  subheading?: string | null;
  members?:    Array<MemberRef | null> | null;
  __context?: { edit?: boolean } | null;
}

function extractKey(ref: MemberRef | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const m = /cms:\/\/content\/([a-f0-9-]+)/i.exec(ref);
    return m?.[1] ?? null;
  }
  return ref.key ?? ref._metadata?.key ?? null;
}

type TeamGridBlockProps = TeamGridData & {
  content?: TeamGridData;
  displaySettings?: Record<string, string | boolean>;
};

// One batched query for every member, not one getContent() per key: a 10-member
// grid was 10 sequential round-trips, each with its own cache entry keyed on a
// single member key.
//
// `photo` is deliberately absent from the selection - it is declared
// indexingType: "disabled", so Graph has no such field on TeamMemberBlock and
// selecting it 400s the whole query. The SDK's own generated query drops it for
// the same reason, so this matches the previous behaviour exactly.
const MEMBERS_BY_KEYS_QUERY = /* GraphQL */ `
  query TeamMembersByKeys($keys: [String!]) {
    TeamMemberBlock(where: { _metadata: { key: { in: $keys } } }, limit: 100) {
      items {
        _metadata { key types displayName locale }
        name
        role
        bio
        linkedinUrl { default }
      }
    }
  }
`;

type MembersResult = { TeamMemberBlock?: { items?: MemberData[] } };

async function fetchMembers(keys: string[]): Promise<MembersResult> {
  "use cache";
  cacheTag("page");
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });

  try {
    return await graphClient().request(MEMBERS_BY_KEYS_QUERY, { keys });
  } catch (error) {
    // Caught inside the cache scope: a rejected promise inside "use cache"
    // fails static generation outright and no call-site try/catch can rescue
    // it. The cost is that an outage is cached for the revalidate window.
    console.error("[fetchMembers] Graph query failed:", error);
    return {};
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
    <section data-component="TeamGridBlock" className="py-20 max-w-7xl mx-auto px-8">
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
