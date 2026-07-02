import Image from "next/image";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { TEXT_ALIGN, TEXT_ALIGN_CLASSES } from "../_shared/displayTemplateSettings";

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
      items: { type: "content", allowedTypes: ["_image"] },
      indexingType: "disabled",
    },
  },
});

export const LogoGridColorTemplate = displayTemplate({
  key: "LogoGridColorTemplate",
  isDefault: false,
  displayName: "Full color logos",
  contentType: "LogoGridBlock",
  tag: "Color",
  settings: {
    size: {
      editor: "select" as const,
      displayName: "Logo size",
      sortOrder: 0,
      choices: {
        sm:      { displayName: "Small",    sortOrder: 0 },
        default: { displayName: "Standard", sortOrder: 1 },
        lg:      { displayName: "Large",    sortOrder: 2 },
      },
    },
    showNames: {
      editor: "checkbox" as const,
      displayName: "Show partner names",
      sortOrder: 1,
      choices: {},
    },
    ...TEXT_ALIGN,
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
  displayTemplateKey?: string;
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
  const { pa } = getPreviewUtils(data as any);

  const isColor = props.displayTemplateKey === "LogoGridColorTemplate";
  const showNames = ds?.showNames === true;
  const sizeKey = (ds?.size as string) || "default";
  const { wrapper: logoWrapper, imgSizes } = LOGO_SIZES[sizeKey] ?? LOGO_SIZES["default"];

  const alignKey = (ds?.textAlign as string) || "center";
  const textAlignClass = TEXT_ALIGN_CLASSES[alignKey] ?? "text-center";
  const flexAlignClass = FLEX_ALIGN[alignKey] ?? "justify-center";

  const logos = (data.logos ?? []).filter((l): l is LogoItem => l !== null);
  const showPlaceholders = logos.length === 0;

  return (
    <section data-component="LogoGridBlock" className={`py-20 px-8 max-w-7xl mx-auto ${textAlignClass}`}>
      {data.heading && (
        <h2
          {...pa("heading")}
          className="font-display text-2xl md:text-3xl font-extrabold text-on-surface mb-3"
        >
          {data.heading}
        </h2>
      )}
      {data.subheading && (
        <p
          {...pa("subheading")}
          className="text-sm text-on-surface-variant mb-12 max-w-xl mx-auto"
        >
          {data.subheading}
        </p>
      )}

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
