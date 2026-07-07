import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { DEFAULT_SITE_SETTINGS } from "@/lib/siteSettings";

// Singleton shared block for cross-cutting UI strings (the pattern shown on
// /demo/global-settings). Fetched by getSiteSettings() with hardcoded
// fallbacks, so the chrome renders identically when no instance exists.
export const SiteSettingsType = contentType({
  key: "SiteSettings",
  displayName: "Site Settings",
  baseType: "_component",
  properties: {
    logoTextPrimary:     { type: "string", displayName: "Logo Text (Primary)", isLocalized: true },
    logoTextSecondary:   { type: "string", displayName: "Logo Text (Secondary)", isLocalized: true },
    searchPlaceholder:   { type: "string", displayName: "Search Placeholder", isLocalized: true },
    searchLoadingText:   { type: "string", displayName: "Search Loading Text", isLocalized: true },
    searchNoResultsText: { type: "string", displayName: "Search No-Results Text ({query} is replaced)", isLocalized: true },
    searchMinCharsText:  { type: "string", displayName: "Search Minimum-Characters Text", isLocalized: true },
  },
});

interface SiteSettingsData {
  logoTextPrimary?: string | null;
  logoTextSecondary?: string | null;
  searchPlaceholder?: string | null;
  searchLoadingText?: string | null;
  searchNoResultsText?: string | null;
  searchMinCharsText?: string | null;
}

type SiteSettingsPreviewProps = SiteSettingsData & { content?: SiteSettingsData };

const PREVIEW_FIELDS: Array<{ prop: keyof SiteSettingsData; label: string }> = [
  { prop: "logoTextPrimary", label: "Logo text (primary)" },
  { prop: "logoTextSecondary", label: "Logo text (secondary)" },
  { prop: "searchPlaceholder", label: "Search placeholder" },
  { prop: "searchLoadingText", label: "Search loading text" },
  { prop: "searchNoResultsText", label: "Search no-results text" },
  { prop: "searchMinCharsText", label: "Search minimum-characters text" },
];

// Editor preview for the SiteSettings block: a labelled list of every string,
// with the hardcoded default shown for fields left empty.
export function SiteSettingsPreview(props: SiteSettingsPreviewProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as Parameters<typeof getPreviewUtils>[0]);

  return (
    <div data-component="SiteSettingsPreview" className="max-w-xl m-4 bg-surface-lowest border border-ghost-border rounded-xl shadow-lg p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant opacity-70 mb-3">
        Site settings
      </p>
      <dl className="space-y-3">
        {PREVIEW_FIELDS.map(({ prop, label }) => {
          const value = data[prop];
          return (
            <div key={prop}>
              <dt className="text-xs font-semibold text-on-surface-variant">{label}</dt>
              <dd {...pa(prop)} className="text-sm text-on-surface">
                {value ?? (
                  <span className="opacity-60">
                    {DEFAULT_SITE_SETTINGS[prop]} (default)
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default function SiteSettings() {
  return null;
}
