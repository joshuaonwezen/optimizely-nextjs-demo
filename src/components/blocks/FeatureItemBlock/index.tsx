import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND, HEADING_SIZE, FONT_STYLE,
  BG_CLASSES, HEADING_CLASSES, FONT_CLASSES,
} from "../_shared/displayTemplateSettings";

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

const FEATURE_SETTINGS = {
  ...BACKGROUND,
  ...HEADING_SIZE,
  ...FONT_STYLE,
};

export const FeatureItemOutlinedTemplate = displayTemplate({
  key: "FeatureItemOutlinedTemplate",
  isDefault: false,
  displayName: "Outlined card",
  contentType: "FeatureItemBlock",
  tag: "Outlined",
  settings: FEATURE_SETTINGS,
});

export const FeatureItemBrandTemplate = displayTemplate({
  key: "FeatureItemBrandTemplate",
  isDefault: false,
  displayName: "Coloured card",
  contentType: "FeatureItemBlock",
  tag: "Brand",
  settings: FEATURE_SETTINGS,
});

export const FeatureItemFlatTemplate = displayTemplate({
  key: "FeatureItemFlatTemplate",
  isDefault: false,
  displayName: "Flat (divider only)",
  contentType: "FeatureItemBlock",
  tag: "Flat",
  settings: FEATURE_SETTINGS,
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
  const { pa } = getPreviewUtils(data as any);

  const isOutlined = props.displayTemplateKey === "FeatureItemOutlinedTemplate";
  const isFlat = props.displayTemplateKey === "FeatureItemFlatTemplate";
  const isBrand = props.displayTemplateKey === "FeatureItemBrandTemplate";

  const bgKey = (ds?.background as string) || (isBrand ? "blueGrad" : isFlat ? "transparent" : "white");
  const bg = BG_CLASSES[bgKey] ?? BG_CLASSES.white;
  const headingClass = HEADING_CLASSES[(ds?.headingSize as string) ?? "sm"];
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];

  let structureClass: string;
  if (isFlat) {
    structureClass = "p-8 border-b border-outline-variant";
  } else if (isOutlined) {
    structureClass = `rounded-2xl p-8 border border-outline-variant ${bg.wrapper}`;
  } else {
    structureClass = `rounded-2xl p-8 ${bg.wrapper || "bg-surface-lowest"}`;
  }

  return (
    <div data-component="FeatureItemBlock" className={`h-full ${structureClass}`}>
      {data.title && (
        <h3
          {...pa("title")}
          className={`${fontClass} ${headingClass} font-bold mb-3 ${bg.text || "text-on-surface"}`}
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
