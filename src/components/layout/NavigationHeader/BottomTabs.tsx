"use client";

import Link from "next/link";
import { useEffect } from "react";
import { localizeHref } from "@/lib/localeUrl";

const TABS = [
  { href: "/", label: "Home", icon: <path d="M3 9.5L10 3l7 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /> },
  { href: "/personal", label: "Products", icon: <><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/></> },
  { href: "/demo", label: "Demo", icon: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 8.5l5 3.5-5 3.5V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></> },
  { href: "/demo/personalization", label: "Account", icon: <><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></> },
];

/** Fixed mobile tab bar, shown instead of the hamburger when FX mobile_nav = bottom_tabs. */
export function BottomTabs({ currentLocale }: { currentLocale: string }) {
  // Reserve space for the fixed bar so it doesn't overlay the footer.
  useEffect(() => {
    document.body.style.paddingBottom = "calc(4rem + env(safe-area-inset-bottom))";
    return () => { document.body.style.paddingBottom = ""; };
  }, []);

  return (
    <nav aria-label="Primary" className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface-lowest border-t border-ghost-border flex safe-pb">
      {TABS.map(({ href, label, icon }) => (
        <Link key={href} href={localizeHref(href, currentLocale)} prefetch={false} className="flex-1 flex flex-col items-center py-3 gap-1 text-on-surface-variant hover:text-brand transition-colors">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">{icon}</svg>
          <span className="text-[10px] font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
