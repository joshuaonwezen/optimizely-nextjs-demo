import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { OptimizelyComponent, getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { cacheTag } from "next/cache";
import { CACHE_TAGS, cachePublishedContent, cachedQueryFailed } from "@/lib/optimizely/cacheProfile";
import { TeamMemberBlockType } from "@/components/blocks/TeamMemberBlock";
import { BlockErrorBoundary } from "@/components/cms/BlockErrorBoundary";
import { graphClient } from "@/lib/optimizely/graphClient";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses, COLUMNS, alignBoxClass, columnsClass,
  SPACING, CONTENT_WIDTH, HEADING_SIZE, TEXT_ALIGN, spacingClass, widthClass, withDefault,
} from "../_shared/displayTemplateSettings";
import { extractKey, orderByKeys, type ContentRef, type ImageRef } from "../_shared/contentRefs";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";

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
    ...withDefault(HEADING_SIZE, "md"),
    ...withDefault(TEXT_ALIGN, "center"),
    ...FONT_STYLE,
    ...SPACING,
    ...CONTENT_WIDTH,
    ...COLUMNS,
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
  return orderByKeys(res?.TeamMemberBlock?.items ?? [], keys);
}

export default async function TeamGridBlock(props: TeamGridBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const ds = props.displaySettings;
  const style = resolveStyleClasses(ds, { background: "transparent", headingSize: "md", textAlign: "center" });

  const keys = (data.members ?? [])
    .map(extractKey)
    .filter((k): k is string => Boolean(k));
  const members = await loadMembers(keys);

  return (
    <section data-component="TeamGridBlock" className={`${spacingClass(ds, "py-20")} ${widthClass(ds, "max-w-7xl")} mx-auto px-8 ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}>
      <div className={`${style.align} mb-12 max-w-2xl ${alignBoxClass(ds, "center")}`}>
        <BlockHeader heading={data.heading} subheading={data.subheading} pa={pa} style={style} headingSize={style.heading} />
      </div>
      {members.length > 0 && (
        <div {...pa("members")} className={`grid grid-cols-1 ${columnsClass(ds, "sm:grid-cols-2 md:grid-cols-3")} gap-6`}>
          {members.map((m, i) => (
            <BlockErrorBoundary key={i}>
              <OptimizelyComponent content={asSdkContent(m)} />
            </BlockErrorBoundary>
          ))}
        </div>
      )}
    </section>
  );
}
