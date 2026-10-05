import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { getConsultants } from "@/lib/graphql/queries/GetConsultants";
import ConsultantCard from "@/components/consultants/ConsultantCard";
import {
  BACKGROUND_NONE_DEFAULT, HEADING_SIZE, TEXT_ALIGN, FONT_STYLE, SPACING, CONTENT_WIDTH, COLUMNS,
  resolveStyleClasses, columnsClass, spacingClass, widthClass, withDefault,
} from "../_shared/displayTemplateSettings";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";

// Lists every ConsultantPage on the instance - no manual references to maintain.
// Place this on the Consultants hub page's Main Content so new consultant profiles
// show up automatically as they're seeded or authored.
export const ConsultantListBlockType = contentType({
  key: "ConsultantListBlock",
  displayName: "Consultant List",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading",    indexingType: "searchable", isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", isLocalized: true },
  },
});

export const ConsultantListBlockDefaultTemplate = displayTemplate({
  key: "ConsultantListBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "ConsultantListBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...withDefault(HEADING_SIZE, "md"),
    ...withDefault(TEXT_ALIGN, "center"),
    ...FONT_STYLE,
    ...SPACING,
    ...CONTENT_WIDTH,
    ...COLUMNS,
  },
});

interface ConsultantListData {
  heading?: string | null;
  subheading?: string | null;
}

type ConsultantListBlockProps = ConsultantListData & {
  content?: ConsultantListData;
  displaySettings?: Record<string, string | boolean>;
};

export default async function ConsultantListBlock(props: ConsultantListBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const ds = props.displaySettings;
  const style = resolveStyleClasses(ds, { background: "transparent", headingSize: "md", textAlign: "center" });

  const consultants = await getConsultants();

  return (
    <section
      data-component="ConsultantListBlock"
      data-track-view="ConsultantListBlock"
      className={`${spacingClass(ds, "py-16")} ${widthClass(ds, "max-w-6xl")} mx-auto px-8 ${style.wrapper}`}
    >
      <div className={`${style.align} mb-10`}>
        <BlockHeader heading={data.heading} subheading={data.subheading} pa={pa} style={style} headingSize={style.heading} align={style.align} />
      </div>
      {consultants.length > 0 ? (
        <div className={`grid grid-cols-1 ${columnsClass(ds, "sm:grid-cols-2 lg:grid-cols-3")} gap-4`}>
          {consultants.map((c, i) => (
            <ConsultantCard key={c._metadata?.key ?? i} item={c} />
          ))}
        </div>
      ) : (
        <p className={`text-sm ${style.textMuted}`}>No consultants to show yet.</p>
      )}
    </section>
  );
}
