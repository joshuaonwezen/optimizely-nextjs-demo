"use client";

import Link from "next/link";
import type { SupportedLocale } from "@/lib/graphql/queries/GetSupportedLocales";
import { buildLocaleUrl } from "@/lib/localeUrl";
import { NavDropdown } from "./NavDropdown";

interface Props {
  locales: SupportedLocale[];
  currentLocale: string;
  pathname: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Language switcher for md+ screens. */
export function LocaleMenu({ locales, currentLocale, pathname, open, onOpenChange }: Props) {
  return (
    <NavDropdown
      open={open}
      onOpenChange={onOpenChange}
      className="relative ml-2"
      panelClassName="absolute top-full right-0 pt-2 z-50"
      trigger={(triggerProps) => (
        <button
          type="button"
          {...triggerProps}
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
      )}
    >
      <div className="bg-surface-lowest border border-ghost-border rounded-xl shadow-lg py-2 min-w-[80px]">
        {locales.map((locale) => (
          <Link
            key={locale.code}
            href={buildLocaleUrl(pathname, locale.code)}
            aria-current={locale.code === currentLocale ? "true" : undefined}
            className={`block px-4 py-1.5 text-sm transition-colors hover:bg-surface-low ${
              locale.code === currentLocale ? "text-brand font-semibold" : "text-on-surface-variant hover:text-brand"
            }`}
          >
            {locale.label}
          </Link>
        ))}
      </div>
    </NavDropdown>
  );
}
