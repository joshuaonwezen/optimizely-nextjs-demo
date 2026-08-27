import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND_NONE_DEFAULT, TEXT_COLOR, FONT_STYLE, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import BranchFinderWidget from "./BranchFinderWidget";

export const BranchFinderBlockType = contentType({
  key: "BranchFinderBlock",
  displayName: "Branch Finder",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:     { type: "string",  displayName: "Heading",            indexingType: "searchable", isLocalized: true },
    intro:       { type: "string",  displayName: "Intro",              indexingType: "searchable", isLocalized: true },
    placeholder: { type: "string",  displayName: "Search Placeholder", indexingType: "searchable", isLocalized: true },
    buttonLabel: { type: "string",  displayName: "Button Label",       indexingType: "searchable", isLocalized: true },
    defaultRadius: { type: "integer", displayName: "Default Radius (km)" },
  },
});

export const BranchFinderBlockDefaultTemplate = displayTemplate({
  key: "BranchFinderBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "BranchFinderBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface BranchFinderBlockData {
  heading?: string | null;
  intro?: string | null;
  placeholder?: string | null;
  buttonLabel?: string | null;
  defaultRadius?: number | null;
}

type BranchFinderBlockProps = BranchFinderBlockData & {
  content?: BranchFinderBlockData;
  displaySettings?: Record<string, string | boolean>;
};

export default function BranchFinderBlock(props: BranchFinderBlockProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as Parameters<typeof getPreviewUtils>[0]);
  const style = resolveStyleClasses(props.displaySettings, { background: "transparent" });

  return (
    <section data-component="BranchFinderBlock" className="py-16">
      <div className={`max-w-2xl mx-auto px-8 ${style.wrapper ? `${style.wrapper} rounded-2xl p-8` : ""}`}>
        {data.heading && (
          <h2 className={`${style.font} text-3xl font-extrabold mb-4 ${style.text}`} {...pa("heading")}>
            {data.heading}
          </h2>
        )}
        {data.intro && (
          <p className={`text-base mb-8 ${style.textMuted}`} {...pa("intro")}>
            {data.intro}
          </p>
        )}

        <BranchFinderWidget
          placeholder={data.placeholder}
          buttonLabel={data.buttonLabel}
          defaultRadius={data.defaultRadius}
        />
      </div>
    </section>
  );
}
