import { contentType, getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { TimelineMilestoneBlockType } from "@/components/blocks/TimelineMilestoneBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";

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

// The Graph returns contentReference array items in three different shapes
// depending on the query path:
//   1. As objects with a top-level `key` (inline composition reads)
//   2. As objects with `_metadata.key` (explicit Graph fragment reads)
//   3. As raw "cms://content/<key>" URI strings (some seed payloads)
// extractKey handles all three so this block works wherever it's rendered.
type MilestoneRef =
  | string
  | { key?: string | null; _metadata?: { key?: string | null } | null };

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

function extractKey(ref: MilestoneRef | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") {
    const m = /cms:\/\/content\/([a-f0-9-]+)/i.exec(ref);
    return m?.[1] ?? null;
  }
  return ref.key ?? ref._metadata?.key ?? null;
}

type TimelineBlockProps = TimelineData & {
  content?: TimelineData;
  displaySettings?: Record<string, string | boolean>;
};

async function loadMilestones(keys: string[]): Promise<MilestoneData[]> {
  if (keys.length === 0) return [];
  const results = await Promise.all(
    keys.map((key) =>
      getClient().getContent({ key }, { next: { revalidate: 300 } } as any).catch(() => null)
    )
  );
  return results.filter((item): item is MilestoneData => Boolean(item));
}

export default async function TimelineBlock(props: TimelineBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  const keys = (data.milestones ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const milestones = await loadMilestones(keys);

  return (
    <section data-component="TimelineBlock" className="py-20 max-w-3xl mx-auto px-8">
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
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={m as any} />
            </BlockErrorBoundary>
          ))}
        </ol>
      )}
    </section>
  );
}
