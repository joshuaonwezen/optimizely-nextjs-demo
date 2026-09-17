import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import {
  BACKGROUND_NONE_DEFAULT, TEXT_COLOR, TEXT_ALIGN, FONT_STYLE, TEXT_ALIGN_CLASSES,
  isChecked, resolveStyleClasses, withDefault, HEADING_SIZE, SPACING, CONTENT_WIDTH, alignBoxClass, spacingClass, widthClass,
} from "../_shared/displayTemplateSettings";
import { BlockHeader } from "../_shared/BlockHeader";
import { asSdkContent } from "@/components/cms/sdkTypes";

export const LogoGridBlockType = contentType({
  key: "LogoGridBlock",
  displayName: "Logo / Partner Grid",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled"],
  properties: {
    heading:    { type: "string", displayName: "Heading",    isLocalized: true },
    subheading: { type: "string", displayName: "Subheading", isLocalized: true },
    logos: {
      type: "array",
      displayName: "Partner Logos",
      // No indexingType: "disabled" here - it drops the field from Graph and the SDK query.
      items: { type: "content", allowedTypes: ["_image"] },
    },
  },
});

export const LogoGridBlockDefaultTemplate = displayTemplate({
  key: "LogoGridBlockDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "LogoGridBlock",
  settings: {
    ...BACKGROUND_NONE_DEFAULT,
    ...TEXT_COLOR,
    ...withDefault(HEADING_SIZE, "sm"),
    ...withDefault(TEXT_ALIGN, "center"),
    ...FONT_STYLE,
    ...SPACING,
    ...CONTENT_WIDTH,
    size: {
      editor: "select" as const,
      displayName: "Logo size",
      sortOrder: 10,
      choices: {
        default: { displayName: "Standard", sortOrder: 0 },
        sm:      { displayName: "Small",    sortOrder: 1 },
        lg:      { displayName: "Large",    sortOrder: 2 },
      },
    },
    fullColor: {
      editor: "checkbox" as const,
      displayName: "Full color logos",
      sortOrder: 11,
      choices: {},
    },
    showNames: {
      editor: "checkbox" as const,
      displayName: "Show partner names",
      sortOrder: 12,
      choices: {},
    },
  },
});

interface LogoItem {
  _metadata?: {
    url?: { default?: string | null } | null;
    displayName?: string | null;
  } | null;
}

interface LogoGridData {
  heading?:    string | null;
  subheading?: string | null;
  logos?:      Array<LogoItem | null> | null;
}

type LogoGridBlockProps = LogoGridData & {
  content?: LogoGridData;
  displaySettings?: Record<string, string | boolean>;
};

const PLACEHOLDER_COUNT = 6;

const LOGO_SIZES: Record<string, { wrapper: string; imgSizes: string }> = {
  sm:      { wrapper: "w-24 h-12", imgSizes: "96px" },
  default: { wrapper: "w-32 h-16", imgSizes: "128px" },
  lg:      { wrapper: "w-40 h-20", imgSizes: "160px" },
};

const FLEX_ALIGN: Record<string, string> = {
  left:   "justify-start",
  center: "justify-center",
  right:  "justify-end",
};

export default function LogoGridBlock(props: LogoGridBlockProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));

  const isColor = isChecked(ds, "fullColor");
  const showNames = isChecked(ds, "showNames");
  const sizeKey = (ds?.size as string) || "default";
  const { wrapper: logoWrapper, imgSizes } = LOGO_SIZES[sizeKey] ?? LOGO_SIZES["default"];

  const style = resolveStyleClasses(ds, { background: "transparent", headingSize: "sm" });
  const alignKey = (ds?.textAlign as string) || "center";
  const textAlignClass = TEXT_ALIGN_CLASSES[alignKey] ?? "text-center";
  const flexAlignClass = FLEX_ALIGN[alignKey] ?? "justify-center";

  const logos = (data.logos ?? []).filter((l): l is LogoItem => l !== null);
  const showPlaceholders = logos.length === 0;

  return (
    <section
      data-component="LogoGridBlock"
      className={`${spacingClass(ds, "py-20")} px-8 ${widthClass(ds, "max-w-7xl")} mx-auto ${textAlignClass} ${style.wrapper ? `${style.wrapper} rounded-2xl` : ""}`}
    >
      <BlockHeader
        heading={data.heading}
        subheading={data.subheading}
        pa={pa}
        style={style}
        headingSize={style.heading}
        subheadingClassName={`text-sm mb-12 max-w-xl ${alignBoxClass(ds, "center")}`}
      />

      <div className={`flex flex-wrap items-center gap-8 ${flexAlignClass}`}>
        {showPlaceholders
          ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
              <div
                key={i}
                className={`${logoWrapper} rounded-xl bg-surface-low flex items-center justify-center text-xs text-on-surface-variant opacity-50`}
              >
                Logo {i + 1}
              </div>
            ))
          : logos.map((logo, i) => {
              const src  = logo._metadata?.url?.default;
              const name = logo._metadata?.displayName ?? `Partner ${i + 1}`;
              if (!src) return null;
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative ${logoWrapper} ${isColor ? "" : "grayscale opacity-70"} hover:grayscale-0 transition-all duration-300 hover:opacity-100`}
                  >
                    <Image
                      src={src}
                      alt={name}
                      fill
                      className="object-contain"
                      sizes={imgSizes}
                    />
                  </div>
                  {showNames && (
                    <span className="text-xs text-on-surface-variant">{name}</span>
                  )}
                </div>
              );
            })}
      </div>
    </section>
  );
}
