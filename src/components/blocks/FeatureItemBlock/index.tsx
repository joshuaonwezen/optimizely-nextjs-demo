import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";

export const FeatureItemBlockType = contentType({
  key: "FeatureItemBlock",
  displayName: "Feature Item",
  baseType: "_component",
  compositionBehaviors: ["elementEnabled"],
  properties: {
    title: { type: "string", displayName: "Title", indexingType: "searchable" },
    description: { type: "string", displayName: "Description" },
  },
});

export const FeatureItemOutlinedTemplate = displayTemplate({
  key: "FeatureItemOutlinedTemplate",
  isDefault: false,
  displayName: "Outlined Feature Item",
  contentType: "FeatureItemBlock",
  tag: "Outlined",
  settings: {},
});

export const FeatureItemFlatTemplate = displayTemplate({
  key: "FeatureItemFlatTemplate",
  isDefault: false,
  displayName: "Flat Feature Item",
  contentType: "FeatureItemBlock",
  tag: "Flat",
  settings: {},
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

const VARIANT_CLASSES: Record<string, string> = {
  card: "rounded-2xl p-8 bg-surface-lowest",
  flat: "p-8",
  outlined: "rounded-2xl p-8 border border-ghost-border",
};

export default function FeatureItemBlock(props: FeatureItemBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);

  let variant = "card";
  if (props.displayTemplateKey === "FeatureItemOutlinedTemplate") variant = "outlined";
  else if (props.displayTemplateKey === "FeatureItemFlatTemplate") variant = "flat";
  if (ds?.variant) variant = ds.variant as string;

  const vs = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.card;

  return (
    <div className={`h-full ${vs}`}>
      {data.title && (
        <h3
          {...pa("title")}
          className="font-display text-base font-bold mb-3 text-on-surface"
        >
          {data.title}
        </h3>
      )}
      {data.description && (
        <p
          {...pa("description")}
          className="text-sm leading-relaxed text-on-surface-variant"
        >
          {data.description}
        </p>
      )}
    </div>
  );
}
