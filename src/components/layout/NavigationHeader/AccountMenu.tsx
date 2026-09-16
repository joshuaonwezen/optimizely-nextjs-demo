"use client";

import Link from "next/link";
import { localizeHref } from "@/lib/localeUrl";
import { Chevron } from "./navIcons";
import { NavDropdown } from "./NavDropdown";

interface Props {
  isLoggedIn: boolean;
  currentLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MENU_LINK = "block px-4 py-2 text-sm text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors";

/** Demo sign-in state for md+ screens: a Sign In link, or the account dropdown. */
export function AccountMenu({ isLoggedIn, currentLocale, open, onOpenChange }: Props) {
  if (!isLoggedIn) {
    return (
      <Link
        href="/demo/personalization"
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:text-brand hover:bg-surface-low transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <NavDropdown
      open={open}
      onOpenChange={onOpenChange}
      className="relative ml-1"
      panelClassName="absolute top-full right-0 pt-2 z-50"
      trigger={(triggerProps, isOpen) => (
        <button
          type="button"
          {...triggerProps}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-sm font-semibold transition-colors bg-surface-low text-on-surface hover:bg-surface"
        >
          <span aria-hidden="true" className="w-6 h-6 rounded-full bg-brand-fill text-on-brand text-[10px] font-bold flex items-center justify-center flex-shrink-0">MB</span>
          <span>My Account</span>
          <Chevron open={isOpen} />
        </button>
      )}
    >
      <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg py-2 min-w-44">
        <Link href={localizeHref("/personal", currentLocale)} className={MENU_LINK}>Dashboard</Link>
        <Link href={localizeHref("/personal/savings", currentLocale)} className={MENU_LINK}>My Accounts</Link>
        <div className="border-t border-ghost-border my-1" />
        <Link href="/demo/personalization" className={MENU_LINK}>Sign Out</Link>
      </div>
    </NavDropdown>
  );
}
