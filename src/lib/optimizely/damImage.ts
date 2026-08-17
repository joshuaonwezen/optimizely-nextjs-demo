// Optimizely CMP public asset URLs support on-the-fly CDN resizing via query
// params (see support.optimizely.com "Generate and edit public URLs for assets").
// This only works on the CMP DAM host - CMS globalassets (*.cms.optimizely.com)
// and Graph CDN ignore the params - so every helper here is host-gated and passes
// non-DAM URLs through untouched.

const DAM_HOSTS = [".cmp.optimizely.com"];

export interface DamResizeOpts {
  width?: number;
  height?: number;
  action?: "Crop" | "Padding" | "Border";
  centerWidth?: number; // 0-100 focal point %
  centerHeight?: number;
}

// Default responsive width ladder. Ceiling matches the blocks' hardcoded
// sizes="(max-width: 1280px) 100vw, 1280px" (1600 covers 2x on ~800px columns).
export const DEFAULT_DAM_WIDTHS = [400, 800, 1200, 1600];

export function isDamUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return DAM_HOSTS.some((h) => hostname.endsWith(h));
  } catch {
    return false;
  }
}

// Returns the URL unchanged if it is not a CMP DAM URL; otherwise merges the
// resize params via the WHATWG URL API so any existing query string (e.g. a
// preview token) is preserved rather than clobbered.
export function damImageUrl(url: string, opts: DamResizeOpts): string {
  if (!isDamUrl(url)) return url;

  const u = new URL(url);
  const set = (key: string, value: number | string | undefined) => {
    if (value !== undefined && value !== null && value !== "") {
      u.searchParams.set(key, String(value));
    }
  };

  set("width", opts.width);
  set("height", opts.height);
  set("action", opts.action);
  set("center_width", opts.centerWidth);
  set("center_height", opts.centerHeight);

  return u.toString();
}

export interface DamSrcsetOpts extends Omit<DamResizeOpts, "width" | "height"> {
  // Height / width. When set (together with action: "Crop"), each srcset
  // candidate gets a height scaled from its width so every size is the same
  // shape. Example: 16:9 -> 9/16 = 0.5625.
  aspectRatio?: number;
}

// Builds a "url 400w, url 800w, ..." srcSet by requesting each width from the
// CDN. Returns undefined for non-DAM URLs so callers can fall back to the SDK's
// rendition-based getSrcset().
export function buildDamSrcset(
  url: string,
  widths: number[] = DEFAULT_DAM_WIDTHS,
  opts: DamSrcsetOpts = {},
): string | undefined {
  if (!isDamUrl(url)) return undefined;

  const { aspectRatio, ...resize } = opts;

  return widths
    .map((w) => {
      const height =
        aspectRatio !== undefined ? Math.round(w * aspectRatio) : undefined;
      return `${damImageUrl(url, { ...resize, width: w, height })} ${w}w`;
    })
    .join(", ");
}
