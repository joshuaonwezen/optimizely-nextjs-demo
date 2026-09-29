"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DemoCategory } from "@/lib/getDemoLinks";
import { byGroup, hasGroups } from "@/lib/getDemoLinks";
import { Chevron } from "./navIcons";
import { NavDropdown } from "./NavDropdown";

interface Props {
  demoCategories: DemoCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * One track definition, used by every block in the panel, so a CMS sub-group
 * column lands on the same grid line as the category column below it.
 */
const COLUMN_GRID = "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-8";

/**
 * Transparent strip covering the gap between the trigger pill and the panel.
 *
 * The panel hangs off the <nav>'s bottom edge (top-full against a static
 * wrapper), but the pill is only 32px tall and vertically centred in the 64px
 * nav - so 16px of nav sits between them. Without this the cursor leaves the
 * wrapper on the way down, NavDropdown's onMouseLeave fires and the menu shuts.
 *
 * It spans the full width because the panel does: people cut diagonally towards
 * the first column, not straight down. Being a DOM child of the panel keeps the
 * cursor inside the wrapper the whole way.
 *
 * h-4 is exact, not approximate: the pill is 32px (20px line-height + py-1.5)
 * centred in the 64px nav, so its bottom edge is at 48px and the nav's is at
 * 64px. The strip abuts the pill with no gap and no overlap, which keeps it off
 * the sibling controls - it only clips the last pixel of the taller ones, and
 * only while the menu is open.
 */
function HoverBridge() {
  return <div aria-hidden className="absolute inset-x-0 -top-4 h-4" />;
}

/**
 * Heads a column. The slot means "a group of links" whether it came from a
 * sub-group or a top-level category, so both render identically - a category
 * with sub-groups contributes its groups as peer columns rather than carrying
 * its own label.
 */
function ColumnHeading({ label }: { label: string }) {
  return <p className="type-eyebrow text-[10px] text-on-surface-variant/55 mb-2">{label}</p>;
}

/**
 * Label only. Descriptions live on the /demo index cards, where there is room -
 * 32 of them in this panel is what made it unreadable.
 */
function DemoLink({
  link,
  active,
  onNavigate,
}: {
  link: DemoCategory["links"][number];
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      // Next calls this before its own navigation, so closing here is safe - the
      // panel unmounts after the click has already been handled.
      onClick={onNavigate}
      className={`block rounded-lg px-2 py-1.5 text-sm font-medium leading-snug transition-colors ${
        active
          ? "bg-surface-low text-brand"
          : "text-on-surface-variant hover:bg-surface-low hover:text-brand"
      }`}
    >
      {link.label}
    </Link>
  );
}

function LinkList({
  links,
  pathname,
  onNavigate,
}: {
  links: DemoCategory["links"];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {links.map((link) => (
        <li key={link.href}>
          <DemoLink link={link} active={pathname === link.href} onNavigate={onNavigate} />
        </li>
      ))}
    </ul>
  );
}

/** The "Developer" mega-menu of /demo pages (md+ screens). */
export function DeveloperMenu({ demoCategories, open, onOpenChange }: Props) {
  const pathname = usePathname();

  // Every link in the panel closes the menu on click. Navigating to a demo page
  // otherwise leaves the panel covering the page it just opened, since the
  // cursor is still inside it and nothing else clears the open state.
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // A category earns its own band by using sub-groups; the rest share a row of
  // columns underneath. Nothing here is hardcoded to a category label.
  const banded = demoCategories.filter(hasGroups);
  const columned = demoCategories.filter((category) => !hasGroups(category));
  const total = demoCategories.reduce((n, c) => n + c.links.length, 0);

  return (
    <NavDropdown
      menuId="developer"
      open={open}
      onOpenChange={onOpenChange}
      triggerIsLink
      // static, so the panel's containing block is the <nav> and it can span the
      // header container. The panel is still a DOM child, so the hover/blur
      // wiring on the wrapper is unaffected.
      className="static"
      panelClassName="absolute inset-x-0 top-full pt-2 z-50"
      trigger={(triggerProps, isOpen) => (
        <Link
          href="/demo"
          {...triggerProps}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold font-body transition-colors bg-brand-fill text-on-brand hover:bg-brand-fill-dim"
        >
          Developer
          <Chevron open={isOpen} />
        </Link>
      )}
    >
      <HoverBridge />
      <div
        data-component="DeveloperMenu"
        className="nav-panel-in bg-surface-lowest border border-ghost-border rounded-2xl shadow-ambient p-6 xl:p-8 max-h-[calc(100vh-5rem)] overflow-y-auto"
      >
        <div className="flex items-baseline justify-between mb-6">
          <p className="type-eyebrow text-[11px] text-on-surface-variant">Developer demos</p>
          <Link
            href="/demo"
            onClick={close}
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-brand"
          >
            View all {total}
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>

        <div className="space-y-8">
          {banded.map((category) => (
            <div key={category.label} className={COLUMN_GRID}>
              {byGroup(category.links).map(([group, links]) => (
                <div key={group}>
                  {group && <ColumnHeading label={group} />}
                  <LinkList links={links} pathname={pathname} onNavigate={close} />
                </div>
              ))}
            </div>
          ))}

          {columned.length > 0 && (
            <div className={COLUMN_GRID}>
              {columned.map((category) => (
                <div key={category.label}>
                  <ColumnHeading label={category.label} />
                  <LinkList links={category.links} pathname={pathname} onNavigate={close} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </NavDropdown>
  );
}
