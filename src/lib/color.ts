// Editor-picked colors (the Color picker CMS UI extension stores "#rrggbb"). The contrast
// rule matches the extension's, so the text color the editor is shown is the one the
// site renders.

/** The site's on-surface ink, the dark text it pairs with light backgrounds. */
export const INK = "#08251a";
export const WHITE = "#ffffff";

/** "#1a73e8" for a #rgb or #rrggbb value (any case, spaces trimmed), else null. */
export function normalizeHex(value: string | null | undefined): string | null {
  const v = (value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return null;
}

// WCAG 2.x relative luminance of a #rrggbb color.
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #rrggbb colors, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** White or ink text, whichever reads better on the background, and how well. */
export function readableText(background: string): { color: string; ratio: number } {
  const onWhite = contrastRatio(background, WHITE);
  const onInk = contrastRatio(background, INK);
  return onWhite >= onInk ? { color: WHITE, ratio: onWhite } : { color: INK, ratio: onInk };
}
