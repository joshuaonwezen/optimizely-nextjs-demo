import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { BACKGROUND, TEXT_COLOR, FONT_STYLE, FONT_CLASSES, resolveStyleClasses } from "../_shared/displayTemplateSettings";
import { resolveLinkHref } from "@/lib/optimizely/resolveLinkHref";
import { Button } from "@/components/ui/Button";

export const CallToActionType = contentType({
  key: "CallToAction",
  displayName: "Call to Action",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    label: { type: "string", displayName: "Label", isLocalized: true, sortOrder: 10 },
    // Native link picker: internal page selection + external/anchor/email URLs.
    // Resolve at render with resolveLinkHref() (internal refs come back as cms://).
    link: { type: "url", displayName: "Link", sortOrder: 20 },
  },
});

const CTA_SIZE_SETTING = {
  size: {
    editor: "select" as const,
    displayName: "Button size",
    sortOrder: 10,
    choices: {
      default: { displayName: "Default", sortOrder: 0 },
      large:   { displayName: "Large",   sortOrder: 1 },
    },
  },
  ...TEXT_COLOR,
  ...FONT_STYLE,
};

export const CallToActionDefaultTemplate = displayTemplate({
  key: "CallToActionDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "CallToAction",
  settings: {
    ...BACKGROUND,
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

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
      sortOrder: 10,
      choices: {
        default: { displayName: "Normal", sortOrder: 0 },
        large:   { displayName: "Large",  sortOrder: 1 },
      },
    },
    ...TEXT_COLOR,
    ...FONT_STYLE,
  },
});

interface CallToActionData {
  label?: string | null;
  // type:"url" link — Graph returns { default, hierarchical }.
  link?: { default?: string | null; hierarchical?: string | null } | null;
  __context?: any;
}

type CallToActionProps = CallToActionData & {
  content?: CallToActionData;
  displaySettings?: Record<string, string | boolean>;
  displayTemplateKey?: string;
};

// Button.tsx's built-in variants don't cover "outline"/"surface" pixel-for-pixel
// (solid border-brand instead of a low-alpha ghost stroke, an extra border on
// the white button) - use variant="custom" with these classes to preserve the
// existing look rather than silently drifting it while migrating to the primitive.
const VARIANT_CLASSES: Record<string, string> = {
  outline: "bg-transparent text-brand border-2 border-brand",
  surface: "bg-surface-lowest text-brand border-2 border-outline-variant",
};

export default async function CallToActionBlock(props: CallToActionProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(data as any);
  const fontClass = FONT_CLASSES[(ds?.fontStyle as string) ?? "modern"];
  const style = resolveStyleClasses(ds, { background: "transparent", textColor: "brand" });

  // Resolve the link picker (internal refs come back as cms://content/{key}).
  const resolved = await resolveLinkHref(data.link);
  const isEdit = !!data.__context?.edit;
  const href = isEdit ? undefined : resolved;

  const isGhost = props.displayTemplateKey === "CallToActionGhostTemplate";
  const variant =
    props.displayTemplateKey === "CallToActionOutlineTemplate" ? "outline" :
    props.displayTemplateKey === "CallToActionSurfaceTemplate" ? "surface" :
    "brand";
  const isLarge = ds?.size === "large";

  // Edit-mode affordance: a tidy chip instead of a raw mono URL string.
  const editChips = (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <span
        {...pa("link")}
        className="inline-flex items-center gap-1.5 rounded-full bg-on-surface/5 px-3 py-1 text-xs text-on-surface-variant cursor-pointer hover:bg-on-surface/10 transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M6.5 9.5L9.5 6.5M7 4l.5-.5a3 3 0 0 1 4.2 4.2l-.5.5M9 12l-.5.5a3 3 0 0 1-4.2-4.2l.5-.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {resolved ? `→ ${resolved}` : "Set a link"}
      </span>
    </div>
  );

  if (isGhost) {
    return (
      <div data-component="CallToActionBlock" data-track-view="CallToActionBlock" className="py-12 text-center">
        {(href || isEdit) && (
          <a
            href={isEdit ? undefined : href}
            data-track-event="mb_cta_click"
            data-track-tags={JSON.stringify({ label: data.label ?? "", variant: "ghost" })}
            className={`${fontClass} inline-flex items-center gap-2 font-semibold ${style.text} hover:underline underline-offset-4 ${isLarge ? "text-lg" : "text-base"}`}
          >
            <span {...pa("label")}>{data.label ?? "Learn More"}</span>
            <span aria-hidden>→</span>
          </a>
        )}
        {isEdit && editChips}
      </div>
    );
  }

  const customClass = VARIANT_CLASSES[variant];

  return (
    <div data-component="CallToActionBlock" data-track-view="CallToActionBlock" className="py-12 text-center">
      {(href || isEdit) && (
        <Button
          href={isEdit ? undefined : href}
          variant={customClass ? "custom" : "primary"}
          size={isLarge ? "large" : "default"}
          fontClassName={fontClass}
          className={customClass}
          data-track-event="mb_cta_click"
          data-track-tags={JSON.stringify({ label: data.label ?? "", variant })}
        >
          <span {...pa("label")}>{data.label ?? "Get Started"}</span>
        </Button>
      )}
      {isEdit && editChips}
    </div>
  );
}
