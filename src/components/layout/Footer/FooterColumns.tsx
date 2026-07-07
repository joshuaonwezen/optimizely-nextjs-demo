"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { FooterData } from "@/lib/graphql/queries/GetFooter";
import { getCurrentLocale, localizeHref } from "@/lib/localeUrl";

interface Props {
  footer: FooterData;
  /** Per-locale footers (e.g. { nl: {...} }); locales not present fall back to `footer`. */
  localizedFooters?: Record<string, FooterData>;
}

interface TaglineProps {
  /** Fallback rendered when the CMS block has no tagline. */
  fallback: string;
  tagline: string | null;
  localizedTaglines?: Record<string, string | null>;
}

// The tagline sits in the footer's bottom row, away from the columns, but
// needs the same client-side locale pick - the server Footer renders in the
// root layout and doesn't know the request path.
export function FooterTagline({ fallback, tagline, localizedTaglines }: TaglineProps) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const text =
    (locale === "en" ? tagline : localizedTaglines?.[locale] ?? tagline) ?? fallback;

  return <p data-component="FooterTagline" className="text-sm text-on-surface-variant">{text}</p>;
}

// CMS-driven bank link columns. Hrefs from the CMS carry English (or
// unprefixed) paths - rewrite every internal link to the active locale, same
// as the header nav does in NavItems.tsx.
export default function FooterColumns({ footer, localizedFooters }: Props) {
  const pathname = usePathname();
  const locale = getCurrentLocale(pathname);
  const data = locale === "en" ? footer : localizedFooters?.[locale] ?? footer;

  if (data.columns.length === 0) return null;

  return (
    <div
      data-component="FooterColumns"
      className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10 pb-10 mb-10 border-b border-ghost-border"
    >
      {data.columns.map((column) => (
        <div key={column.key}>
          <Link
            href={localizeHref(column.href, locale)}
            className="text-sm font-semibold text-on-surface hover:text-brand transition-colors"
          >
            {column.label}
          </Link>
          <ul className="mt-3 space-y-2">
            {column.children.map((link) => (
              <li key={link.key}>
                <Link
                  href={localizeHref(link.href, locale)}
                  target={link.openInNewTab ? "_blank" : undefined}
                  rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                  className="text-sm text-on-surface-variant hover:text-brand transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
