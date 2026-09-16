import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { cacheLife, cacheTag } from "next/cache";
import { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { CACHE_TTL } from "@/lib/optimizely/client";
import { graphClient } from "@/lib/optimizely/graphClient";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { extractKey, type ContentRef } from "../_shared/contentRefs";

export const TimelineBlockType = contentType({
  key: "TimelineBlock",
  displayName: "Timeline",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", isLocalized: true },
    milestones: {
      type: "array",
      displayName: "Milestones",
      items: { type: "contentReference", allowedTypes: [TimelineMilestoneBlockType] },
    },
  },
});

export const TimelineBlockDefaultTemplate = displayTemplate({
  key: "TimelineBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "TimelineBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

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
  // contentReference arrays arrive in three shapes - see ContentRef.
  milestones?: Array<ContentRef | null> | null;
  __context?: { edit?: boolean } | null;
}

type TimelineBlockProps = TimelineData & {
  content?: TimelineData;
  displaySettings?: Record<string, string | boolean>;
};

// One batched query for every milestone, not one getContent() per key - see the
// same pattern in TeamGridBlock.
const MILESTONES_BY_KEYS_QUERY = /* GraphQL */ `
  query TimelineMilestonesByKeys($keys: [String!]) {
    TimelineMilestoneBlock(where: { _metadata: { key: { in: $keys } } }, limit: 100) {
      items {
        _metadata { key types displayName locale }
        date
        title
        description
      }
    }
  }
`;

type MilestonesResult = { TimelineMilestoneBlock?: { items?: MilestoneData[] } };

async function fetchMilestones(keys: string[]): Promise<MilestonesResult> {
  "use cache";
  cacheTag("page");
  cacheLife({ stale: 300, revalidate: CACHE_TTL, expire: CACHE_TTL * 24 });

  try {
    return await graphClient().request(MILESTONES_BY_KEYS_QUERY, { keys });
  } catch (error) {
    // Caught inside the cache scope: a rejected promise inside "use cache"
    // fails static generation outright and no call-site try/catch can rescue
    // it. The cost is that an outage is cached for the revalidate window.
    console.error("[fetchMilestones] Graph query failed:", error);
    return {};
  }
}

async function loadMilestones(keys: string[]): Promise<MilestoneData[]> {
  if (keys.length === 0) return [];
  const res = await fetchMilestones(keys);
  const items = res?.TimelineMilestoneBlock?.items ?? [];

  // Chronology is the editor's ordering of `milestones`, and the query gives no
  // ordering guarantee - so map results back over `keys`. Dedupe by key first:
  // Graph returns one document per locale.
  const byKey = new Map<string, MilestoneData>();
  for (const item of items) {
    const k = item?._metadata?.key;
    if (k && !byKey.has(k)) byKey.set(k, item);
  }
  return keys.map((k) => byKey.get(k)).filter((m): m is MilestoneData => Boolean(m));
}

export default async function TimelineBlock(props: TimelineBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);
  const style = resolveStyleClasses(props.displaySettings, { background: "transparent" });

  const keys = (data.milestones ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const milestones = await loadMilestones(keys);

  return (
    <section data-component="TimelineBlock" className="py-20 max-w-3xl mx-auto px-8">
      {data.heading && (
        <h2
          {...pa("heading")}
          className={`${style.font} text-3xl md:text-4xl font-extrabold ${style.text} mb-3`}
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className={`text-base ${style.textMuted} mb-12 max-w-2xl`}
        >
          {data.subheading}
        </p>
      )}
      {milestones.length > 0 && (
        <ol {...pa("milestones")} className="list-none p-0">
          {milestones.map((m, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={m as any} />
            </BlockErrorBoundary>
          ))}
        </ol>
      )}
    </section>
  );
}
