import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { graphClient } from "@/lib/optimizely/graphClient";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { extractKey, type ContentRef, orderByKeys } from "../_shared/contentRefs";
import { BlockHeader } from "../_shared/BlockHeader";

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
  cacheTag(CACHE_TAGS.page);
  cachePublishedContent();

  try {
    return await graphClient().request(MILESTONES_BY_KEYS_QUERY, { keys });
  } catch (error) {
    return cachedQueryFailed("fetchMilestones", error);
  }
}

async function loadMilestones(keys: string[]): Promise<MilestoneData[]> {
  if (keys.length === 0) return [];
  const res = await fetchMilestones(keys);
  // Chronology is the editor's ordering of `milestones`.
  return orderByKeys(res?.TimelineMilestoneBlock?.items ?? [], keys);
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
    <section data-component="TimelineBlock" className={`py-20 max-w-3xl mx-auto px-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}>
      <BlockHeader
        heading={data.heading}
        subheading={data.subheading}
        pa={pa}
        style={style}
        subheadingClassName="text-base mb-12 max-w-2xl"
      />
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
