"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { NavNode } from "@/lib/graphql/queries/GetNavigation";
import SearchOverlay from "@/components/layout/SearchOverlay";

interface Props {
  tree: NavNode[];
  demoLinks: { href: string; label: string }[];
}

export default function NavItems({ tree, demoLinks }: Props) {
  const [activeKey,    setActiveKey]    = useState<string | null>(null);
  const [searchOpen,   setSearchOpen]   = useState(false);

  if (tree.length === 0) return null;

  return (
    <>
    {searchOpen && createPortal(<SearchOverlay onClose={() => setSearchOpen(false)} />, document.body)}
    <div className="flex items-center gap-1">
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
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  className={`transition-transform duration-150 ${isActive ? "rotate-180" : ""}`}
                  fill="none"
                >
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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

            {/* Dropdown panel */}
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

      {/* Demo dropdown */}
      <div
        className="relative"
        onMouseEnter={() => setActiveKey("__demo__")}
        onMouseLeave={() => setActiveKey(null)}
      >
        <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors font-body ${activeKey === "__demo__" ? "text-brand" : "text-on-surface-variant hover:text-brand"}`}>
          Demo
          <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform duration-150 ${activeKey === "__demo__" ? "rotate-180" : ""}`} fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {activeKey === "__demo__" && (
          <div className="absolute top-full right-0 pt-2 z-50">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg py-2 min-w-52">
              {demoLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-4 py-1.5 text-sm text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search icon */}
      <button
        onClick={() => setSearchOpen(true)}
        aria-label="Search"
        className="ml-2 p-2 rounded-lg text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.5 12.5L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
    </>
  );
}
