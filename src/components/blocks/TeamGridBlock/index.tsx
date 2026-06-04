import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import { TEAM_MEMBER_FRAGMENT } from "@/components/blocks/TeamMemberBlock/fragment";

export const TeamGridBlockType = contentType({
  key: "TeamGridBlock",
  displayName: "Team Grid",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading" },
    subheading: { type: "string", displayName: "Subheading" },
    members:    {
      type: "array",
      displayName: "Members",
      items: { type: "contentReference", allowedTypes: [TeamMemberBlockType] },
    },
  },
});

// Inline composition stores contentReference array items as raw cms URI
// strings; Graph-fetched references come back as objects with _metadata.
type MemberRef = string | { _metadata?: { key?: string | null } | null };

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
  return ref._metadata?.key ?? null;
}

type TeamGridBlockProps = TeamGridData & {
  content?: TeamGridData;
  displaySettings?: Record<string, string | boolean>;
};

const MEMBERS_BY_KEYS_QUERY = /* GraphQL */ `
  query TeamMembersByKeys($keys: [String!]) {
    TeamMemberBlock(where: { _metadata: { key: { in: $keys } } }) {
      items { ...TeamMemberBlockData }
    }
  }
  ${TEAM_MEMBER_FRAGMENT}
`;

async function loadMembers(keys: string[]): Promise<MemberData[]> {
  if (keys.length === 0) return [];
  const res = await graphqlFetch<{ TeamMemberBlock?: { items?: MemberData[] } }>(
    MEMBERS_BY_KEYS_QUERY,
    { keys },
    { next: { revalidate: 300 } }
  );
  const items = res.data?.TeamMemberBlock?.items ?? [];
  const byKey = new Map(items.map((i) => [i._metadata?.key, i]));
  return keys
    .map((k) => byKey.get(k))
    .filter((i): i is MemberData => Boolean(i));
}

export default async function TeamGridBlock(props: TeamGridBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const keys = (data.members ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const members = await loadMembers(keys);

  return (
    <section className="py-20 max-w-7xl mx-auto px-8">
      <div className="text-center mb-12 max-w-2xl mx-auto">
        {data.heading && (
          <h2 {...pa("heading")} className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-3">
            {data.heading}
          </h2>
        )}
        {data.subheading && (
          <p {...pa("subheading")} className="text-base text-on-surface-variant">
            {data.subheading}
          </p>
        )}
      </div>
      {members.length > 0 && (
        <div {...pa("members")} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {members.map((m, i) => (
            <OptimizelyComponent key={i} content={m as any} />
          ))}
        </div>
      )}
    </section>
  );
}
