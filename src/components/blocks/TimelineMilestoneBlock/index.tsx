import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const TimelineMilestoneBlockType = contentType({
  key: "TimelineMilestoneBlock",
  displayName: "Timeline Milestone",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    date:        { type: "string", displayName: "Date (e.g. 1998, Mar 2024)" },
    title:       { type: "string", displayName: "Title" },
    description: { type: "string", displayName: "Description" },
  },
});

interface TimelineMilestoneData {
  date?:        string | null;
  title?:       string | null;
  description?: string | null;
  __context?: { edit?: boolean } | null;
}

type TimelineMilestoneBlockProps = TimelineMilestoneData & {
  content?: TimelineMilestoneData;
  displaySettings?: Record<string, string | boolean>;
};

export default function TimelineMilestoneBlock(props: TimelineMilestoneBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as any);

  return (
    <li className="relative pl-10 pb-10 border-l-2 border-ghost-border last:pb-0">
      <span className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-brand border-4 border-surface" />
      {data.date && (
        <p
          {...pa("date")}
          className="text-xs font-bold uppercase tracking-widest text-brand mb-2"
        >
          {data.date}
        </p>
      )}
      {data.title && (
        <h3
          {...pa("title")}
          className="font-display text-xl font-bold text-on-surface mb-2"
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className="text-base text-on-surface-variant leading-relaxed"
        >
          {data.description}
        </p>
      )}
    </li>
  );
}
