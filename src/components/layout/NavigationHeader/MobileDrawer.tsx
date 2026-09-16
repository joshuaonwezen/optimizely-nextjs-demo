"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";
import type { DemoCategory } from "@/lib/getDemoLinks";
import type { SupportedLocale } from "@/lib/graphql/queries/GetSupportedLocales";
import type { SiteSettingsStrings } from "@/lib/siteSettings";
import { buildLocaleUrl } from "@/lib/localeUrl";
import MoseyBankLogo from "@/components/MoseyBankLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Chevron, SearchIcon } from "./navIcons";
import { NavLink } from "./NavLink";

interface Props {
  tree: NavNode[];
  demoCategories: DemoCategory[];
  locales: SupportedLocale[];
  currentLocale: string;
  pathname: string;
  settings: SiteSettingsStrings;
  isLoggedIn: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

const DEMO_SECTION = "__demo__";
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Full-screen mobile menu. A modal dialog: focus moves in on open, Tab stays inside,
 * Escape closes, and focus returns to whatever opened it. Rendered into a portal by
 * NavItems; any link click closes it.
 */
export function MobileDrawer({ tree, demoCategories, locales, currentLocale, pathname, settings, isLoggedIn, onClose, onOpenSearch }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [demoCategory, setDemoCategory] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("[data-drawer-close]")?.focus();
    // Lock vertical scroll while the drawer is open.
    document.body.style.overflowY = "hidden";
    return () => {
      document.body.style.overflowY = "";
      opener?.focus();
    };
  }, []);

  function toggleSection(key: string) {
    setExpanded((prev) => (prev === key ? null : key));
    setDemoCategory(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a")) onClose();
      }}
      className="md:hidden fixed inset-0 z-[60] flex flex-col bg-surface-lowest"
    >
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-ghost-border flex-shrink-0">
        <Link href={buildLocaleUrl("/", currentLocale)} prefetch={false} aria-label={`${settings.logoTextPrimary} ${settings.logoTextSecondary} home`}>
          <MoseyBankLogo primary={settings.logoTextPrimary} secondary={settings.logoTextSecondary} />
        </Link>
        <button
          type="button"
          data-drawer-close
          onClick={onClose}
          aria-label="Close menu"
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-low transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* CMS nav tree */}
        <div className="px-4 py-4 space-y-0.5">
          {tree.map((node) => {
            if (!node.children.length) {
              return (
                <NavLink
                  key={node.key}
                  node={node}
                  className="block px-3 py-3 rounded-lg text-base font-medium text-on-surface-variant hover:bg-surface-low hover:text-brand transition-colors"
                />
              );
            }
            const isExpanded = expanded === node.key;
            return (
              <div key={node.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(node.key)}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-lg text-base font-medium text-on-surface-variant hover:bg-surface-low transition-colors"
                >
                  {node.label}
                  <Chevron open={isExpanded} />
                </button>
                {isExpanded && (
                  <div className="ml-3 pl-3 border-l-2 border-ghost-border space-y-0.5 mb-1">
                    {node.children.map((child) =>
                      child.children.length > 0 ? (
                        <div key={child.key} className="mb-1">
                          <NavLink
                            node={child}
                            className="block py-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-brand transition-colors"
                          />
                          {child.children.map((grandchild) => (
                            <NavLink
                              key={grandchild.key}
                              node={grandchild}
                              className="block py-2 text-sm text-on-surface-variant hover:text-brand transition-colors"
                            />
                          ))}
                        </div>
                      ) : (
                        <NavLink
                          key={child.key}
                          node={child}
                          className="block py-2 text-sm text-on-surface-variant hover:text-brand transition-colors"
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-ghost-border mx-4" />

        {/* Developer section */}
        <div className="px-4 py-4">
          <button
            type="button"
            onClick={() => toggleSection(DEMO_SECTION)}
            aria-expanded={expanded === DEMO_SECTION}
            className="w-full flex items-center justify-between px-3 py-3 rounded-lg"
          >
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-brand-fill text-on-brand">
              Developer
            </span>
            <Chevron open={expanded === DEMO_SECTION} />
          </button>
          {expanded === DEMO_SECTION && (
            <div className="mt-2 px-3">
              {demoCategories.map((category) => {
                const isOpen = demoCategory === category.label;
                return (
                  <div key={category.label}>
                    <button
                      type="button"
                      onClick={() => setDemoCategory(isOpen ? null : category.label)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between py-2.5 text-left"
                    >
                      <span className="text-sm font-semibold text-on-surface">
                        {category.label}
                        <span className="ml-2 text-xs font-normal text-on-surface-variant">
                          {category.links.length}
                        </span>
                      </span>
                      <Chevron open={isOpen} />
                    </button>
                    {isOpen && (
                      <ul className="ml-3 pl-3 border-l-2 border-ghost-border space-y-0.5 mb-2">
                        {category.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="block py-1.5 text-sm font-medium text-on-surface-variant hover:text-brand transition-colors"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
              <Link href="/demo" className="inline-block mt-2 text-sm text-brand hover:underline font-medium">
                View all demos →
              </Link>
            </div>
          )}
        </div>

        {/* Locale switcher */}
        {locales.length > 1 && (
          <>
            <div className="border-t border-ghost-border mx-4" />
            <div className="px-7 py-4 flex flex-wrap gap-2">
              {locales.map((locale) => (
                <Link
                  key={locale.code}
                  href={buildLocaleUrl(pathname, locale.code)}
                  aria-current={locale.code === currentLocale ? "true" : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    locale.code === currentLocale
                      ? "bg-brand-fill text-on-brand"
                      : "text-on-surface-variant hover:bg-surface-low hover:text-brand"
                  }`}
                >
                  {locale.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Auth */}
      <div className="border-t border-ghost-border mx-4" />
      <div className="px-4 py-4 flex flex-col gap-2">
        {isLoggedIn ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-low">
            <span aria-hidden="true" className="w-8 h-8 rounded-full bg-brand-fill text-on-brand text-xs font-bold flex items-center justify-center flex-shrink-0">MB</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-on-surface">My Account</p>
              <p className="text-xs text-on-surface-variant">Logged in</p>
            </div>
            <Link href="/demo/personalization" className="text-xs text-on-surface-variant hover:text-brand transition-colors">
              Sign out
            </Link>
          </div>
        ) : (
          <Link
            href="/demo/personalization"
            className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-on-surface-variant bg-surface-low hover:text-brand transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>

      {/* Footer: search + theme toggle */}
      <div className="border-t border-ghost-border px-5 py-4 flex-shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-low text-on-surface-variant hover:text-brand transition-colors"
        >
          <SearchIcon />
          <span className="text-sm font-medium">Search</span>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
