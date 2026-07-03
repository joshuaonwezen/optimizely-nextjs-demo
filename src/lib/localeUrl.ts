export const LOCALE_RE = /^[a-z]{2}(-[a-z]{2})?$/;

// Paths that must never take a locale prefix (English-only SDK docs, APIs).
const LOCALE_EXCLUDED_RE = /^\/(demo|api|preview)(\/|$)/;

export function getCurrentLocale(pathname: string): string {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return LOCALE_RE.test(first) ? first : "en";
}

export function buildLocaleUrl(pathname: string, targetLocale: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const hasPrefix = segments.length > 0 && LOCALE_RE.test(segments[0]);
  const rest = hasPrefix ? segments.slice(1) : segments;
  if (targetLocale === "en") {
    return rest.length > 0 ? `/${rest.join("/")}` : "/";
  }
  return rest.length > 0 ? `/${targetLocale}/${rest.join("/")}` : `/${targetLocale}`;
}

// Re-prefix an internal href to the active locale, leaving excluded/external paths untouched.
export function localizeHref(href: string, locale: string): string {
  if (!href.startsWith("/") || LOCALE_EXCLUDED_RE.test(href)) return href;
  return buildLocaleUrl(href, locale);
}
