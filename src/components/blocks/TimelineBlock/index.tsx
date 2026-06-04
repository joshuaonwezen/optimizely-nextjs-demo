import { contentType } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { graphqlFetch } from "@/lib/optimizely/client";
import { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import { TIMELINE_MILESTONE_FRAGMENT } from "@/components/blocks/TimelineMilestoneBlock/fragment";

export const TimelineBlockType = contentType({
  key: "TimelineBlock",
  displayName: "Timeline",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading" },
    subheading: { type: "string", displayName: "Subheading" },
    milestones: {
      type: "array",
      displayName: "Milestones",
      items: { type: "contentReference", allowedTypes: [TimelineMilestoneBlockType] },
    },
  },
});

interface MilestoneRef {
  _metadata?: { key?: string | null } | null;
}

interface MilestoneData {
  __typename?: string;
  _metadata?: { key?: string | null } | null;
  date?:        string | null;
  title?:       string | null;
  description?: string | null;
}

interface TimelineData {
  heading?:    string | null;
  subheading?: string | null;
  milestones?: Array<MilestoneRef | null> | null;
  __context?: { edit?: boolean } | null;
}

type TimelineBlockProps = TimelineData & {
  content?: TimelineData;
  displaySettings?: Record<string, string | boolean>;
};

const MILESTONES_BY_KEYS_QUERY = /* GraphQL */ `
  query MilestonesByKeys($keys: [String!]) {
    TimelineMilestoneBlock(where: { _metadata: { key: { in: $keys } } }) {
      items { ...TimelineMilestoneBlockData }
    }
  }
  ${TIMELINE_MILESTONE_FRAGMENT}
`;

async function loadMilestones(keys: string[]): Promise<MilestoneData[]> {
  if (keys.length === 0) return [];
  const res = await graphqlFetch<{ TimelineMilestoneBlock?: { items?: MilestoneData[] } }>(
    MILESTONES_BY_KEYS_QUERY,
    { keys },
    { next: { revalidate: 300 } }
  );
  const items = res.data?.TimelineMilestoneBlock?.items ?? [];
  const byKey = new Map(items.map((i) => [i._metadata?.key, i]));
  return keys
    .map((k) => byKey.get(k))
    .filter((i): i is MilestoneData => Boolean(i));
}

export default async function TimelineBlock(props: TimelineBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const keys = (data.milestones ?? [])
    .map((m) => m?._metadata?.key)
    .filter((k): k is string => Boolean(k));
  const milestones = await loadMilestones(keys);

  return (
    <section className="py-20 max-w-3xl mx-auto px-8">
      {data.heading && (
        <h2
          {...pa("heading")}
          className="font-display text-3xl md:text-4xl font-extrabold text-on-surface mb-3"
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className="text-base text-on-surface-variant mb-12 max-w-2xl"
        >
          {data.subheading}
        </p>
      )}
      {milestones.length > 0 && (
        <ol {...pa("milestones")} className="list-none p-0">
          {milestones.map((m, i) => (
            <OptimizelyComponent key={i} content={m as any} />
          ))}
        </ol>
      )}
    </section>
  );
}
