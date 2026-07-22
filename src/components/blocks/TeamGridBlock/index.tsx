import { contentType, getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { CACHE_TTL } from "@/lib/optimizely/client";

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

async function loadMembers(keys: string[]): Promise<MemberData[]> {
  if (keys.length === 0) return [];
  const results = await Promise.all(
    keys.map((key) =>
      getClient().getContent({ key }, { next: { revalidate: CACHE_TTL } } as any).catch(() => null)
    )
  );
  return results.filter((item): item is MemberData => Boolean(item));
}

export default async function TeamGridBlock(props: TeamGridBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const keys = (data.members ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const members = await loadMembers(keys);

  return (
    <section data-component="TeamGridBlock" className="py-20 max-w-7xl mx-auto px-8">
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
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={m as any} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}
