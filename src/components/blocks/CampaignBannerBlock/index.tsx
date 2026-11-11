import type { CSSProperties } from "react";
import { contentType, displayTemplate } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { Button } from "@/components/ui/Button";
import { asSdkContent } from "@/components/cms/sdkTypes";
import { normalizeHex, readableText } from "@/lib/color";
import { resolveLinkHref } from "@/lib/optimizely/resolveLinkHref";
import {
  FONT_STYLE, HEADING_SIZE, SPACING, TEXT_ALIGN, resolveStyleClasses, spacingClass, withDefault,
} from "../_shared/displayTemplateSettings";

export const CampaignBannerType = contentType({
  key: "CampaignBanner",
  displayName: "Campaign Banner",
  baseType: "_component",
  compositionBehaviors: ["sectionEnabled", "elementEnabled"],
  properties: {
    heading: { type: "string", displayName: "Heading", indexingType: "searchable", isLocalized: true, sortOrder: 10 },
    body: { type: "string", displayName: "Text", indexingType: "searchable", isLocalized: true, sortOrder: 20 },
    ctaText: { type: "string", displayName: "Button text", isLocalized: true, sortOrder: 30 },
    ctaLink: { type: "url", displayName: "Button link", sortOrder: 40 },
    // A long string (no format) so the Color picker CMS UI extension can be bound to it:
    // Settings > Content Types > Campaign Banner > Background color > User Interface >
    // Editor: Color picker. The binding is CMS-only, so set it on each instance.
    backgroundColor: {
      type: "string",
      displayName: "Background color",
      description: "A hex color like #197050. The text color follows it automatically.",
      sortOrder: 50,
    },
  },
});

export const CampaignBannerDefaultTemplate = displayTemplate({
  key: "CampaignBannerDefaultTemplate",
  isDefault: true,
  displayName: "Default",
  contentType: "CampaignBanner",
  settings: {
    ...withDefault(HEADING_SIZE, "lg"),
    ...FONT_STYLE,
    ...TEXT_ALIGN,
    ...SPACING,
  },
});

// Used when the field is empty or not a hex color: Mosey green.
const FALLBACK_COLOR = "#197050";

interface CampaignBannerData {
  heading?: string | null;
  body?: string | null;
  ctaText?: string | null;
  ctaLink?: { default?: string | null; hierarchical?: string | null } | null;
  backgroundColor?: string | null;
  __context?: { edit?: boolean } | null;
}

type CampaignBannerProps = CampaignBannerData & {
  content?: CampaignBannerData;
  displaySettings?: Record<string, string | boolean>;
};

export default async function CampaignBannerBlock(props: CampaignBannerProps) {
  const data = props.content ?? props;
  const ds = props.displaySettings;
  const { pa } = getPreviewUtils(asSdkContent(data));
  const style = resolveStyleClasses(ds, { headingSize: "lg", textAlign: "left" });
  const isEdit = !!data.__context?.edit;

  if (!data.heading && !data.body) {
    if (!isEdit) return null;
    return (
      <div
        data-component="CampaignBannerBlock"
        {...pa("heading")}
        className="rounded-2xl border-2 border-dashed border-ghost-border p-8 text-sm text-on-surface-variant"
      >
        Add a heading or text, and pick a background color.
      </div>
    );
  }

  const picked = normalizeHex(data.backgroundColor);
  const background = picked ?? FALLBACK_COLOR;
  const text = readableText(background);
  // Custom properties so the button can invert the banner's colors through Tailwind classes.
  const colors = { "--campaign-bg": background, "--campaign-fg": text.color } as CSSProperties;
  const href = isEdit ? undefined : await resolveLinkHref(data.ctaLink);

  return (
    <section
      data-component="CampaignBannerBlock"
      data-track-view="CampaignBannerBlock"
      style={colors}
      className={`rounded-2xl bg-[var(--campaign-bg)] text-[var(--campaign-fg)] px-8 ${spacingClass(ds, "py-12")} ${style.align}`}
    >
      {data.heading && (
        <h2 {...pa("heading")} className={`${style.font} ${style.heading} font-bold`}>
          {data.heading}
        </h2>
      )}
      {data.body && (
        <p {...pa("body")} className="mt-4 max-w-2xl text-lg leading-relaxed opacity-90 [text-align:inherit] inline-block">
          {data.body}
        </p>
      )}
      {(href || (isEdit && data.ctaText)) && (
        <div className="mt-8">
          <Button
            href={href}
            variant="custom"
            pill
            fontClassName={style.font}
            className="bg-[var(--campaign-fg)] text-[var(--campaign-bg)] hover:opacity-90"
            data-track-event="campaign_banner_click"
            data-track-tags={JSON.stringify({ heading: data.heading ?? "", color: background })}
          >
            <span {...pa("ctaText")}>{data.ctaText || "Find out more"}</span>
          </Button>
        </div>
      )}
      {/* Editors see what the color resolved to; visitors never do. */}
      {isEdit && (
        <p {...pa("backgroundColor")} className="mt-6 text-xs opacity-80">
          {picked
            ? `Background ${picked}, ${text.color === "#ffffff" ? "white" : "dark"} text (${text.ratio.toFixed(1)}:1${text.ratio < 4.5 ? " - low contrast, pick a darker or lighter color" : ""})`
            : data.backgroundColor
              ? `"${data.backgroundColor}" isn't a hex color - showing Mosey green.`
              : "No background color yet - showing Mosey green."}
        </p>
      )}
    </section>
  );
}
