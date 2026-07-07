import { contentType } from "@optimizely/cms-sdk";
import { getPreviewUtils } from "@optimizely/cms-sdk/react/server";
import { getFooter, type FooterData } from "@/lib/graphql/queries/GetFooter";
import { getSupportedLocales } from "@/lib/graphql/queries/GetSupportedLocales";
import { NavigationItemType } from "@/components/blocks/NavigationItemBlock";
import { FooterCtaClient } from "./FooterCtaClient";
import FooterColumns, { FooterTagline } from "./FooterColumns";

export const FooterType = contentType({
  key: "Footer",
  displayName: "Footer",
  baseType: "_component",
  properties: {
    tagline: { type: "string", displayName: "Tagline", isLocalized: true },
    // Content area - each column is one NavigationItem (label = column
    // heading, children = links), reusing the header nav's content type.
    columns: {
      type: "array",
      displayName: "Link Columns",
      items: { type: "content", allowedTypes: [NavigationItemType] },
    },
  },
});

const FALLBACK_TAGLINE = "Banking built around you · Mosey Bank";

// Raw column shape as the CMS preview route receives it from Graph.
interface RawFooterColumn {
  label?: string | null;
  href?: { url?: { default?: string | null } | null } | null;
  children?: Array<RawFooterColumn | null | undefined> | null;
}

interface FooterPreviewData {
  tagline?: string | null;
  columns?: Array<RawFooterColumn | null | undefined> | null;
}

type FooterPreviewProps = FooterPreviewData & { content?: FooterPreviewData };

// Editor preview for the Footer block: the tagline plus each link column
// rendered as it appears at the bottom of the live site.
export function FooterPreview(props: FooterPreviewProps) {
  const data = props.content ?? props;
  const { pa } = getPreviewUtils(data as Parameters<typeof getPreviewUtils>[0]);
  const columns = (data.columns ?? []).filter((c): c is RawFooterColumn => Boolean(c));

  return (
    <div data-component="FooterPreview" className="bg-surface-low min-h-full p-8">
      <div className="max-w-3xl mx-auto">
        <div {...pa("columns")} className="grid gap-8 md:grid-cols-3">
          {columns.map((column, i) => (
            <div key={`${column.label}-${i}`}>
              <p className="text-sm font-semibold text-on-surface">{column.label ?? "(untitled)"}</p>
              <ul className="mt-3 space-y-2">
                {(column.children ?? [])
                  .filter((l): l is RawFooterColumn => Boolean(l))
                  .map((link, j) => (
                    <li key={`${link.label}-${j}`} className="text-sm text-on-surface-variant">
                      {link.label ?? "(untitled)"}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        {columns.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            No columns yet - drop NavigationItem blocks into &quot;Link Columns&quot;. Each item&apos;s
            label becomes a column heading and its child items become the links.
          </p>
        )}
        <p {...pa("tagline")} className="mt-8 pt-6 border-t border-ghost-border text-sm text-on-surface-variant text-center">
          {data.tagline ?? FALLBACK_TAGLINE}
        </p>
      </div>
    </div>
  );
}

// Link columns + tagline come from the CMS Footer block (ISR-cacheable) and
// fall back to the hardcoded tagline when the block doesn't exist. The GitHub
// link and the FX-driven CTA stay code-driven.
export default async function Footer() {
  const [footer, locales] = await Promise.all([getFooter(), getSupportedLocales()]);

  // Localized footers for non-English locales (seeded by
  // scripts/seed-localization.ts). Locales without CMS footer content fall
  // back to the English data client-side.
  const localizedFooters: Record<string, FooterData> = {};
  await Promise.all(
    locales
      .filter((l) => l.code !== "en")
      .map(async (l) => {
        const localized = await getFooter({ locale: l.code });
        if (localized) localizedFooters[l.code] = localized;
      })
  );

  return (
    <footer data-component="Footer" data-track-event="mb_nav_click" data-track-tags={JSON.stringify({ source: "footer" })} className="bg-surface-low">
      <FooterCtaClient />
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-8">
          {footer && footer.columns.length > 0 && (
            <FooterColumns footer={footer} localizedFooters={localizedFooters} />
          )}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <FooterTagline
              fallback={FALLBACK_TAGLINE}
              tagline={footer?.tagline ?? null}
              localizedTaglines={Object.fromEntries(
                Object.entries(localizedFooters).map(([code, f]) => [code, f.tagline])
              )}
            />
            <a
              href="https://github.com/joshuaonwezen/optimizely-nextjs-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-brand transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              View source
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
