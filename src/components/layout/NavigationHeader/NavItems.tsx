"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";
import type { DemoCategory } from "@/lib/getDemoLinks";
import type { SupportedLocale } from "@/lib/graphql/queries/GetSupportedLocales";
import SearchOverlay from "@/components/layout/SearchOverlay";
import MoseyBankLogo from "@/components/MoseyBankLogo";
import ThemeToggle from "@/components/ThemeToggle";

interface Props {
  tree: NavNode[];
  demoCategories: DemoCategory[];
  locales: SupportedLocale[];
}

const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;

function getCurrentLocale(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return LOCALE_RE.test(first) ? first : "en";
}

function buildLocaleUrl(pathname: string, targetLocale: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const hasPrefix = segments.length > 0 && LOCALE_RE.test(segments[0]);
  const rest = hasPrefix ? segments.slice(1) : segments;
  if (targetLocale === "en") {
    return rest.length > 0 ? `/${rest.join("/")}` : "/";
  }
  return rest.length > 0 ? `/${targetLocale}/${rest.join("/")}` : `/${targetLocale}`;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10" height="6" viewBox="0 0 10 6" fill="none"
      className={`flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function NavItems({ tree, demoCategories, locales }: Props) {
  const [activeKey,     setActiveKey]     = useState<string | null>(null);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const currentLocale = getCurrentLocale(pathname);

  // Close drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock vertical scroll while drawer is open
  useEffect(() => {
    document.body.style.overflowY = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflowY = ""; };
  }, [mobileOpen]);

  if (tree.length === 0) return null;

  function toggleMobile(key: string) {
    setMobileExpanded(prev => prev === key ? null : key);
  }

  return (
    <>
      {searchOpen && createPortal(
        <SearchOverlay onClose={() => setSearchOpen(false)} />,
        document.body
      )}

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && createPortal(
        <div className="md:hidden fixed inset-0 z-[60] flex flex-col bg-surface-lowest">

          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-ghost-border flex-shrink-0">
            <Link href="/" aria-label="Mosey Bank home" onClick={() => setMobileOpen(false)}>
              <MoseyBankLogo />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-low transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* CMS nav tree */}
            <div className="px-4 py-4 space-y-0.5">
              {tree.map((node) => {
                const isExpanded = mobileExpanded === node.key;
                if (!node.children.length) {
                  return (
                    <Link
                      key={node.key}
                      href={node.href}
                      target={node.openInNewTab ? "_blank" : undefined}
                      rel={node.openInNewTab ? "noopener noreferrer" : undefined}
                      className="block px-3 py-3 rounded-lg text-base font-medium text-on-surface-variant hover:bg-surface-low hover:text-brand transition-colors"
                    >
                      {node.label}
                    </Link>
                  );
                }
                return (
                  <div key={node.key}>
                    <button
                      onClick={() => toggleMobile(node.key)}
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
                              <Link
                                href={child.href}
                                className="block py-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-brand transition-colors"
                              >
                                {child.label}
                              </Link>
                              {child.children.map((grandchild) => (
                                <Link
                                  key={grandchild.key}
                                  href={grandchild.href}
                                  className="block py-2 text-sm text-on-surface-variant hover:text-brand transition-colors"
                                >
                                  {grandchild.label}
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <Link
                              key={child.key}
                              href={child.href}
                              className="block py-2 text-sm text-on-surface-variant hover:text-brand transition-colors"
                            >
                              {child.label}
                            </Link>
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
                onClick={() => toggleMobile("__demo__")}
                className="w-full flex items-center justify-between px-3 py-3 rounded-lg"
              >
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-brand text-on-brand">
                  Developer
                </span>
                <Chevron open={mobileExpanded === "__demo__"} />
              </button>
              {mobileExpanded === "__demo__" && (
                <div className="mt-3 space-y-5 px-3">
                  {demoCategories.map((category) => (
                    <div key={category.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 pb-1.5 border-b border-ghost-border">
                        {category.label}
                      </p>
                      <ul className="space-y-0.5">
                        {category.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="block py-1.5 text-sm font-medium text-on-surface hover:text-brand transition-colors"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Link href="/demo" className="text-sm text-brand hover:underline font-medium">
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
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        locale.code === currentLocale
                          ? "bg-brand text-on-brand"
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

          {/* Drawer footer: search + theme toggle */}
          <div className="border-t border-ghost-border px-5 py-4 flex-shrink-0 flex items-center gap-3">
            <button
              onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
              className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-low text-on-surface-variant hover:text-brand transition-colors"
            >
              <SearchIcon />
              <span className="text-sm font-medium">Search</span>
            </button>
            <ThemeToggle />
          </div>
        </div>,
        document.body
      )}

      {/* ── Desktop nav (md+) ─────────────────────────────── */}
      <div data-component="NavItems" className="hidden md:flex items-center gap-1">

        {/* CMS nav tree */}
        {tree.map((node) => {
          const hasChildren = node.children.length > 0;
          const isActive = activeKey === node.key;

          return (
            <div
              key={node.key}
              className="relative"
              onMouseEnter={() => setActiveKey(node.key)}
              onMouseLeave={() => setActiveKey(null)}
            >
              {hasChildren ? (
                <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors font-body ${isActive ? "text-brand" : "text-on-surface-variant hover:text-brand"}`}>
                  {node.label}
                  <Chevron open={isActive} />
                </button>
              ) : (
                <Link
                  href={node.href}
                  target={node.openInNewTab ? "_blank" : undefined}
                  rel={node.openInNewTab ? "noopener noreferrer" : undefined}
                  className="block px-3 py-2 rounded-lg text-sm font-medium font-body text-on-surface-variant hover:text-brand transition-colors"
                >
                  {node.label}
                </Link>
              )}

              {hasChildren && isActive && (
                <div className="absolute top-full left-0 pt-2 z-50">
                  <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg py-2 min-w-52">
                    {node.children.map((child) =>
                      child.children.length > 0 ? (
                        <div key={child.key}>
                          <Link
                            href={child.href}
                            target={child.openInNewTab ? "_blank" : undefined}
                            rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                            className="block px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-brand transition-colors"
                          >
                            {child.label}
                          </Link>
                          {child.children.map((grandchild) => (
                            <Link
                              key={grandchild.key}
                              href={grandchild.href}
                              target={grandchild.openInNewTab ? "_blank" : undefined}
                              rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                              className="block px-4 py-1.5 text-sm text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
                            >
                              {grandchild.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <Link
                          key={child.key}
                          href={child.href}
                          target={child.openInNewTab ? "_blank" : undefined}
                          rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                          className="block px-4 py-1.5 text-sm text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
                        >
                          {child.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Demo mega-menu */}
        <div
          className="relative"
          onMouseEnter={() => setActiveKey("__demo__")}
          onMouseLeave={() => setActiveKey(null)}
        >
          <Link
            href="/demo"
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold font-body transition-colors bg-brand text-on-brand hover:bg-brand-dim"
          >
            Developer
            <Chevron open={activeKey === "__demo__"} />
          </Link>

          {activeKey === "__demo__" && (
            <div className="absolute top-full right-0 pt-2 z-50">
              <div className="bg-surface-lowest border border-ghost-border rounded-2xl shadow-xl p-5 w-[860px] max-h-[calc(100vh-5rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-on-surface">Developer demos</p>
                  <Link href="/demo" className="text-xs text-brand hover:underline font-medium">
                    View all →
                  </Link>
                </div>
                {(() => {
                  const rest = demoCategories.slice(1);
                  const mid = Math.ceil(rest.length / 2);
                  const col2 = rest.slice(0, mid);
                  const col3 = rest.slice(mid);
                  return (
                    <div className="flex gap-5">
                      {demoCategories[0] && (
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 pb-1.5 border-b border-ghost-border">
                            {demoCategories[0].label}
                          </p>
                          <div className="grid grid-cols-2 gap-x-3">
                            {demoCategories[0].links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                className="group block px-2 py-1.5 rounded-lg hover:bg-surface-low transition-colors"
                              >
                                <span className="block text-sm font-medium text-on-surface group-hover:text-brand transition-colors leading-tight">
                                  {link.label}
                                </span>
                                <span className="block text-xs text-on-surface-variant leading-snug mt-0.5">
                                  {link.description}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="w-px bg-ghost-border flex-shrink-0" />
                      <div className="w-[180px] flex-shrink-0 flex flex-col gap-5">
                        {col2.map((category) => (
                          <div key={category.label}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 pb-1.5 border-b border-ghost-border">
                              {category.label}
                            </p>
                            <ul className="space-y-0.5">
                              {category.links.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    className="group block px-2 py-1.5 rounded-lg hover:bg-surface-low transition-colors"
                                  >
                                    <span className="block text-sm font-medium text-on-surface group-hover:text-brand transition-colors leading-tight">
                                      {link.label}
                                    </span>
                                    <span className="block text-xs text-on-surface-variant leading-snug mt-0.5">
                                      {link.description}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="w-px bg-ghost-border flex-shrink-0" />
                      <div className="w-[180px] flex-shrink-0 flex flex-col gap-5">
                        {col3.map((category) => (
                          <div key={category.label}>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 pb-1.5 border-b border-ghost-border">
                              {category.label}
                            </p>
                            <ul className="space-y-0.5">
                              {category.links.map((link) => (
                                <li key={link.href}>
                                  <Link
                                    href={link.href}
                                    className="group block px-2 py-1.5 rounded-lg hover:bg-surface-low transition-colors"
                                  >
                                    <span className="block text-sm font-medium text-on-surface group-hover:text-brand transition-colors leading-tight">
                                      {link.label}
                                    </span>
                                    <span className="block text-xs text-on-surface-variant leading-snug mt-0.5">
                                      {link.description}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Language switcher */}
        {locales.length > 1 && (
          <div
            className="relative ml-2"
            onMouseEnter={() => setActiveKey("__locale__")}
            onMouseLeave={() => setActiveKey(null)}
          >
            <button
              aria-label="Switch language"
              className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
                <ellipse cx="8" cy="8" rx="2.5" ry="6.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M1.5 6h13M1.5 10h13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
              <span className="uppercase text-xs font-semibold tracking-wide">{currentLocale}</span>
            </button>
            {activeKey === "__locale__" && (
              <div className="absolute top-full right-0 pt-2 z-50">
                <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg py-2 min-w-[80px]">
                  {locales.map((locale) => (
                    <Link
                      key={locale.code}
                      href={buildLocaleUrl(pathname, locale.code)}
                      className={`block px-4 py-1.5 text-sm transition-colors hover:bg-surface-low ${
                        locale.code === currentLocale
                          ? "text-brand font-semibold"
                          : "text-on-surface-variant hover:text-brand"
                      }`}
                    >
                      {locale.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
        >
          <SearchIcon />
        </button>
      </div>

      {/* ── Mobile: search + hamburger ────────────────────── */}
      <div className="flex md:hidden items-center gap-1">
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
        >
          <SearchIcon />
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </>
  );
}
