import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { FONT_STYLE, FONT_CLASSES } from "../_shared/displayTemplateSettings";

export const CallToActionType = contentType({
  key: "CallToAction",
  displayName: "Call to Action",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label", isLocalized: true },
    link: { type: "string", displayName: "Link" },
  },
});

const CTA_SIZE_SETTING = {
  size: {
    editor: "select" as const,
    displayName: "Button size",
    sortOrder: 0,
    choices: {
      default: { displayName: "Default", sortOrder: 0 },
      large:   { displayName: "Large",   sortOrder: 1 },
    },
  },
  ...FONT_STYLE,
};

export const CallToActionOutlineTemplate = displayTemplate({
  key: "CallToActionOutlineTemplate",
  isDefault: false,
  displayName: "Outlined button",
  contentType: "CallToAction",
  tag: "Outline",
  settings: CTA_SIZE_SETTING,
});

export const CallToActionSurfaceTemplate = displayTemplate({
  key: "CallToActionSurfaceTemplate",
  isDefault: false,
  displayName: "White background button",
  contentType: "CallToAction",
  tag: "Surface",
  settings: CTA_SIZE_SETTING,
});

export const CallToActionGhostTemplate = displayTemplate({
  key: "CallToActionGhostTemplate",
  isDefault: false,
  displayName: "Text link with arrow",
  contentType: "CallToAction",
  tag: "Ghost",
  settings: {
    size: {
      editor: "select" as const,
      displayName: "Text size",
      sortOrder: 0,
      choices: {
        default: { displayName: "Normal", sortOrder: 0 },
        large:   { displayName: "Large",  sortOrder: 1 },
      },
    },
    ...FONT_STYLE,
  },
});

interface CallToActionData {
  label?: string | null;
  link?: string | null;
  __context?: any;
}

type CallToActionProps = CallToActionData & {
  content?: CallToActionData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

const VARIANT_CLASSES: Record<string, string> = {
  brand:   "bg-gradient-brand text-on-brand",
  outline: "bg-transparent text-brand border-2 border-brand",
  surface: "bg-surface-lowest text-brand border-2 border-outline-variant",
};

export default function CallToActionBlock(props: CallToActionProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];

  const isGhost = props.displayTemplateKey === "CallToActionGhostTemplate";
  const variant =
    props.displayTemplateKey === "CallToActionOutlineTemplate" ? "outline" :
    props.displayTemplateKey === "CallToActionSurfaceTemplate" ? "surface" :
    "brand";
  const isLarge = ds?.size === "large";

  if (isGhost) {
    return (
      <div data-component="CallToActionBlock" className="py-12 text-center">
        {(data.link || data.__context?.edit) && (
          <a
            href={data.__context?.edit ? undefined : (data.link ?? undefined)}
            data-track-event="mb_cta_click"
            data-track-tags={JSON.stringify({ label: data.label ?? "", variant: "ghost" })}
            className={`${fontClass} inline-flex items-center gap-2 font-semibold text-brand hover:underline underline-offset-4 ${isLarge ? "text-lg" : "text-base"}`}
          >
            <span {...pa("label")}>{data.label ?? "Learn More"}</span>
            <span aria-hidden>→</span>
          </a>
        )}
        {data.__context?.edit && (
          <p
            {...pa("link")}
            className="mt-3 text-xs font-mono text-on-surface-variant/60 cursor-pointer hover:text-on-surface-variant transition-colors"
          >
            {data.link || "Click to set link URL…"}
          </p>
        )}
      </div>
    );
  }

  const vs = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.brand;

  return (
    <div data-component="CallToActionBlock" className="py-12 text-center">
      {(data.link || data.__context?.edit) && (
        <a
          href={data.__context?.edit ? undefined : (data.link ?? undefined)}
          data-track-event="mb_cta_click"
          data-track-tags={JSON.stringify({ label: data.label ?? "", variant })}
          className={`hover-lift ${fontClass} inline-block rounded-lg font-semibold ${isLarge ? "px-12 py-5 text-lg" : "px-10 py-4 text-base"} ${vs}`}
        >
          <span {...pa("label")}>{data.label ?? "Get Started"}</span>
        </a>
      )}
      {data.__context?.edit && (
        <p
          {...pa("link")}
          className="mt-3 text-xs font-mono text-on-surface-variant/60 cursor-pointer hover:text-on-surface-variant transition-colors"
        >
          {data.link || "Click to set link URL…"}
        </p>
      )}
    </div>
  );
}
