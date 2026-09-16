"use client";

import Link from "next/link";
import { Fragment } from "react";
import type { DemoCategory } from "@/lib/getDemoLinks";
import { Chevron } from "./navIcons";
import { NavDropdown } from "./NavDropdown";

interface Props {
  demoCategories: DemoCategory[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CategoryHeading({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-2 pb-1.5 border-b border-ghost-border">
      {label}
    </p>
  );
}

function DemoLink({ link }: { link: DemoCategory["links"][number] }) {
  return (
    <Link href={link.href} className="group block px-2 py-1.5 rounded-lg hover:bg-surface-low transition-colors">
      <span className="block text-sm font-medium text-on-surface group-hover:text-brand transition-colors leading-tight">
        {link.label}
      </span>
      <span className="hidden xl:block text-xs text-on-surface-variant leading-snug mt-0.5">
        {link.description}
      </span>
    </Link>
  );
}

// The first category gets a wide two-column block; the rest are split into two
// stacks balanced by link count.
function balanceStacks(categories: DemoCategory[]): [DemoCategory[], DemoCategory[]] {
  const stacks: [DemoCategory[], DemoCategory[]] = [[], []];
  const counts = [0, 0];
  for (const category of categories) {
    const i = counts[0] <= counts[1] ? 0 : 1;
    stacks[i].push(category);
    counts[i] += category.links.length;
  }
  return stacks;
}

/** The "Developer" mega-menu of /demo pages (md+ screens). */
export function DeveloperMenu({ demoCategories, open, onOpenChange }: Props) {
  const [featured, ...rest] = demoCategories;
  const stacks = balanceStacks(rest);

  return (
    <NavDropdown
      open={open}
      onOpenChange={onOpenChange}
      triggerIsLink
      panelClassName="absolute top-full right-0 pt-2 z-50"
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
      <div className="bg-surface-lowest border border-ghost-border rounded-2xl shadow-xl p-5 w-[540px] lg:w-[700px] xl:w-[860px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-on-surface">Developer demos</p>
          <Link href="/demo" className="text-xs text-brand hover:underline font-medium">
            View all →
          </Link>
        </div>
        <div className="flex gap-5">
          {featured && (
            <div className="flex-[2] min-w-0">
              <CategoryHeading label={featured.label} />
              <div className="grid grid-cols-2 gap-x-3">
                {featured.links.map((link) => (
                  <DemoLink key={link.href} link={link} />
                ))}
              </div>
            </div>
          )}
          {stacks.map((stack, i) => (
            <Fragment key={i}>
              <div className="w-px bg-ghost-border flex-shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-5">
                {stack.map((category) => (
                  <div key={category.label}>
                    <CategoryHeading label={category.label} />
                    <ul className="space-y-0.5">
                      {category.links.map((link) => (
                        <li key={link.href}>
                          <DemoLink link={link} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </NavDropdown>
  );
}
