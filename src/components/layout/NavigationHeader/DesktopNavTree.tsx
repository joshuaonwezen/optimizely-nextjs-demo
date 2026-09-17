"use client";

import type { NavNode } from "@/lib/graphql/queries/GetNavigation";
import { Chevron } from "./navIcons";
import { NavDropdown } from "./NavDropdown";
import { NavLink } from "./NavLink";

interface Props {
  tree: NavNode[];
  activeKey: string | null;
  setActiveKey: (key: string | null) => void;
}

/** Top-level CMS nav items for md+ screens; items with children open a dropdown. */
export function DesktopNavTree({ tree, activeKey, setActiveKey }: Props) {
  return (
    <>
      {tree.map((node) => {
        if (node.children.length === 0) {
          return (
            <div key={node.key} className="relative">
              <NavLink
                node={node}
                className="block px-3 py-2 rounded-lg text-sm font-medium font-body text-on-surface-variant hover:text-brand transition-colors"
              />
            </div>
          );
        }

        return (
          <NavDropdown
            key={node.key}
            menuId={node.key}
            open={activeKey === node.key}
            onOpenChange={(open) => setActiveKey(open ? node.key : null)}
            panelClassName="absolute top-full left-0 pt-2 z-50"
            trigger={(triggerProps, open) => (
              <button
                type="button"
                {...triggerProps}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors font-body ${open ? "text-brand" : "text-on-surface-variant hover:text-brand"}`}
              >
                {node.label}
                <Chevron open={open} />
              </button>
            )}
          >
            <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg p-3 min-w-72 max-w-[min(24rem,calc(100vw-3rem))]">
              <NavLink
                node={node}
                className="mb-2 flex items-center justify-between border-b border-ghost-border px-3 pb-2.5 pt-1 text-sm font-semibold text-on-surface transition-colors hover:text-brand"
              />
              <div className="space-y-2">
                {node.children.map((child) =>
                  child.children.length > 0 ? (
                    <section key={child.key} className="rounded-lg bg-surface-lowest">
                      <NavLink
                        node={child}
                        className="block rounded-lg px-3 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-low hover:text-brand"
                      />
                      <div className="ml-3 border-l border-ghost-border pl-3 pb-1">
                        {child.children.map((grandchild) => (
                          <NavLink
                            key={grandchild.key}
                            node={grandchild}
                            className="block rounded-md px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-low hover:text-brand"
                          />
                        ))}
                      </div>
                    </section>
                  ) : (
                    <NavLink
                      key={child.key}
                      node={child}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-low hover:text-brand"
                    />
                  )
                )}
              </div>
            </div>
          </NavDropdown>
        );
      })}
    </>
  );
}
