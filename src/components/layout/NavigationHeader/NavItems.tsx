"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";
import type { DemoCategory } from "@/lib/getDemoLinks";
import type { SupportedLocale } from "@/lib/graphql/queries/GetSupportedLocales";
import { DEFAULT_SITE_SETTINGS, type SiteSettingsStrings } from "@/lib/siteSettings";
import SearchOverlay from "@/components/layout/SearchOverlay";
import ThemeToggle from "@/components/ThemeToggle";
import { useFxDecision } from "@/lib/optimizely/useFxDecision";
import { getCurrentLocale, localizeHref } from "@/lib/localeUrl";
import { readCookie } from "@/lib/tracking/cookies";
import { DEMO_BUCKETING_ID_COOKIE } from "@/lib/optimizely/cookieNames";
import { useIsClient } from "@/lib/useIsClient";
import { AccountMenu } from "./AccountMenu";
import { BottomTabs } from "./BottomTabs";
import { DesktopNavTree } from "./DesktopNavTree";
import { DeveloperMenu } from "./DeveloperMenu";
import { LocaleMenu } from "./LocaleMenu";
import { MobileDrawer } from "./MobileDrawer";
import { SearchIcon } from "./navIcons";

interface Props {
  tree: NavNode[];
  /** Per-locale nav trees (e.g. { nl: [...] }); locales not present fall back to `tree`. */
  localizedTrees?: Record<string, NavNode[]>;
  demoCategories: DemoCategory[];
  locales: SupportedLocale[];
  /** UI strings from the SiteSettings block; defaults keep the chrome working without CMS data. */
  siteSettings?: SiteSettingsStrings;
  localizedSiteSettings?: Record<string, SiteSettingsStrings>;
}

const DEVELOPER_MENU = "__demo__";
const LOCALE_MENU = "__locale__";
const ACCOUNT_MENU = "__account__";

// Nav hrefs from the CMS carry English (or unprefixed) paths. Rewrite every
// internal link to the active locale so navigating from an /nl page stays on
// /nl - even when the localized nav tree isn't in Graph yet and the English
// tree is serving as the fallback. /demo links are left unprefixed.
function localizeTree(nodes: NavNode[], locale: string): NavNode[] {
  return nodes.map((node) => ({
    ...node,
    href: localizeHref(node.href, locale),
    children: localizeTree(node.children, locale),
  }));
}

export default function NavItems({ tree: baseTree, localizedTrees, demoCategories, locales, siteSettings, localizedSiteSettings }: Props) {
  // Which desktop dropdown is open; one at a time.
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // The drawer remembers the path it was opened on, so navigating closes it
  // without an effect.
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const pathname = usePathname();
  const mobileOpen = drawerPath !== null && drawerPath === pathname;

  const currentLocale = getCurrentLocale(pathname);
  const tree =
    currentLocale === "en"
      ? baseTree
      : localizeTree(localizedTrees?.[currentLocale] ?? baseTree, currentLocale);
  const settings =
    (currentLocale === "en"
      ? siteSettings
      : localizedSiteSettings?.[currentLocale] ?? siteSettings) ?? DEFAULT_SITE_SETTINGS;

  // Logged-in state derives from the demo_bucketing_id cookie, read only after
  // hydration so the server render stays cacheable.
  const isClient = useIsClient();
  const isLoggedIn = isClient && !!readCookie(DEMO_BUCKETING_ID_COOKIE);

  // FX: nav_search_style + mobile_nav, decided client-side.
  const searchStyle = useFxDecision("nav_search_style");
  const searchExpanded = searchStyle?.enabled && (searchStyle.variables.style as string) === "expanded";
  const mobileNav = useFxDecision("mobile_nav");
  const showBottomTabs = mobileNav?.enabled && mobileNav.variationKey === "bottom_tabs";

  if (tree.length === 0) return null;

  const menuProps = (key: string) => ({
    open: activeMenu === key,
    onOpenChange: (open: boolean) => setActiveMenu(open ? key : null),
  });

  return (
    <>
      {searchOpen && createPortal(
        <SearchOverlay onClose={() => setSearchOpen(false)} labels={settings} />,
        document.body
      )}

      {mobileOpen && createPortal(
        <MobileDrawer
          tree={tree}
          demoCategories={demoCategories}
          locales={locales}
          currentLocale={currentLocale}
          pathname={pathname}
          settings={settings}
          isLoggedIn={isLoggedIn}
          onClose={() => setDrawerPath(null)}
          onOpenSearch={() => { setDrawerPath(null); setSearchOpen(true); }}
        />,
        document.body
      )}

      {/* Desktop nav (md+) */}
      <div data-component="NavItems" className="hidden md:flex items-center gap-1">
        <DesktopNavTree tree={tree} activeKey={activeMenu} setActiveKey={setActiveMenu} />
        <DeveloperMenu demoCategories={demoCategories} {...menuProps(DEVELOPER_MENU)} />
        {locales.length > 1 && (
          <LocaleMenu locales={locales} currentLocale={currentLocale} pathname={pathname} {...menuProps(LOCALE_MENU)} />
        )}
        <AccountMenu isLoggedIn={isLoggedIn} currentLocale={currentLocale} {...menuProps(ACCOUNT_MENU)} />
        <ThemeToggle />

        {/* Search - icon or expanded pill (FX: nav_search_style) */}
        {searchExpanded ? (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm text-on-surface-variant bg-surface-low border border-ghost-border hover:border-brand/40 hover:text-brand transition-colors min-w-[140px]"
          >
            <SearchIcon />
            <span className="text-xs">{settings.searchPlaceholder}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
          >
            <SearchIcon />
          </button>
        )}
      </div>

      {/* Mobile: search + hamburger (hidden when bottom tabs are active) */}
      <div className={`${showBottomTabs ? "hidden" : "flex"} md:hidden items-center gap-1`}>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
        >
          <SearchIcon />
        </button>
        <button
          type="button"
          onClick={() => setDrawerPath(pathname)}
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          aria-haspopup="dialog"
          className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {showBottomTabs && <BottomTabs currentLocale={currentLocale} />}
    </>
  );
}
