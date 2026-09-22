import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { getTaxonomyTerms } from "@/lib/graphql/queries/GetTaxonomyTerms";
import {
  BACKGROUND_NONE_DEFAULT, HEADING_SIZE, TEXT_ALIGN, FONT_STYLE, SPACING, CONTENT_WIDTH, COLUMNS,
  columnsClass, isChecked, pageContainer, resolveStyleClasses, spacingClass, widthClass,
} from "../_shared/displayTemplateSettings";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";
import RecommendationBlockClient from "./RecommendationBlockClient";

const DEFAULT_LIMIT = 3;

export const RecommendationBlockType = contentType({
  key: "RecommendationBlock",
  displayName: "Recommendations",
  description:
    "Articles chosen from the categories this visitor reads, their Data Platform audience, or the section they are browsing.",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", indexingType: "searchable", isLocalized: true },
    limit: { type: "integer", displayName: "Number of articles" },
  },
});

export const RecommendationBlockDefaultTemplate = displayTemplate({
  key: "RecommendationBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "RecommendationBlock",
  settings: {
    showReason: {
      editor: "checkbox" as const,
      displayName: "Show why these were picked",
      sortOrder: 10,
      choices: {},
    },
    ...BACKGROUND_NONE_DEFAULT,
    ...HEADING_SIZE,
    ...TEXT_ALIGN,
    ...FONT_STYLE,
    ...SPACING,
    ...CONTENT_WIDTH,
    ...COLUMNS,
  },
});

interface RecommendationBlockData {
  heading?: string | null;
  subheading?: string | null;
  limit?: number | null;
}

type RecommendationBlockProps = RecommendationBlockData & {
  content?: RecommendationBlockData;
  displaySettings?: Record<string, string | boolean>;
  placement?: "element" | "section";
};

// Server shell (CMS-authored chrome) plus a client child for the personalized items.
// The split is forced: see the comment in RecommendationBlockClient.tsx.
export default async function RecommendationBlock(props: RecommendationBlockProps) {
  const data: RecommendationBlockData = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const ds = props.displaySettings;
  const style = resolveStyleClasses(ds, { background: "transparent" });

  // Cached, cookie-free Graph read, so the shell stays safe on an ISR page. Terms are
  // passed to the client so ArticleCard can label categories without a second request.
  const { terms } = await getTaxonomyTerms();
  const limit = Math.min(Math.max(data.limit ?? DEFAULT_LIMIT, 1), 12);

  return (
    <section
      data-component="RecommendationBlock"
      data-track-view="RecommendationBlock"
      className={`${style.wrapper} ${spacingClass(ds, "py-16")}`}
    >
      <div className={pageContainer(props.placement, `${widthClass(ds, "max-w-6xl")} mx-auto px-8`)}>
        <BlockHeader
          heading={data.heading}
          subheading={data.subheading}
          pa={pa}
          style={style}
          headingSize={style.heading}
          align={style.align}
          subheadingClassName="text-base mb-8"
        />
        <RecommendationBlockClient
          limit={limit}
          terms={terms}
          columnsClassName={columnsClass(ds, "sm:grid-cols-2 lg:grid-cols-3")}
          mutedClassName={style.textMuted}
          showReason={isChecked(ds, "showReason")}
        />
      </div>
    </section>
  );
}
