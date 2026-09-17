import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, TEXT_COLOR, HEADING_SIZE_CARD, FONT_STYLE, HEADING_CLASSES, resolveStyleClasses, withDefault,
} from "../_shared/displayTemplateSettings";
import { asSdkContent } from "@/components/cms/sdkTypes";

export const FeatureItemBlockType = contentType({
  key: "FeatureItemBlock",
  displayName: "Feature Item",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    title: { type: "string", displayName: "Title", indexingType: "searchable", isLocalized: true },
    description: { type: "string", displayName: "Description", indexingType: "searchable", isLocalized: true },
  },
});

// The old "Outlined card" and "Colored card" templates are now Background choices on
// Default: White is the outlined card, Bright green the colored one, None a bare outline.
export const FeatureItemBlockDefaultTemplate = displayTemplate({
  key: "FeatureItemBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "FeatureItemBlock",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...withDefault(HEADING_SIZE_CARD, "sm"),
    ...FONT_STYLE,
  },
});

// Flat renders without a background wrapper, so the background setting is omitted
export const FeatureItemFlatTemplate = displayTemplate({
  key: "FeatureItemFlatTemplate",
  isDefault: false,
  displayName: "Flat (divider only)",
  contentType: "FeatureItemBlock",
  tag: "Flat",
  settings: {
    ...withDefault(HEADING_SIZE_CARD, "sm"),
    ...FONT_STYLE,
  },
});

interface FeatureItemData {
  title?: string | null;
  description?: string | null;
  __context?: { edit?: boolean } | null;
}

type FeatureItemBlockProps = FeatureItemData & {
  content?: FeatureItemData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

export default function FeatureItemBlock(props: FeatureItemBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));

  const isFlat = props.displayTemplateKey === "FeatureItemFlatTemplate";

  const bg = resolveStyleClasses(ds, { background: isFlat ? "transparent" : "white" });
  const headingClass = HEADING_CLASSES[(ds?.headingSize as string) || "sm"];

  const structureClass = isFlat
    ? "p-8 border-b border-outline-variant"
    : `rounded-2xl p-8 ${bg.wrapper || "border border-outline-variant"}`;

  return (
    <div data-component="FeatureItemBlock" className={`h-full ${structureClass}`}>
      {data.title && (
        <h3
          {...pa("title")}
          className={`${bg.font} ${headingClass} font-bold mb-3 ${bg.text || "text-on-surface"}`}
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className={`text-sm leading-relaxed ${bg.textMuted || "text-on-surface-variant"}`}
        >
          {data.description}
        </p>
      )}
    </div>
  );
}
