// Imported by next.config.ts and the middleware, so this module stays edge-safe:
// relative imports only, Web Crypto rather than node:crypto, no "server-only".
import { getCmsUrl } from "../optimizely/cmsUrl";
import { HEAD_SCRIPTS } from "../headScripts";

export const STRICT_CSP_DEMO_PATH = "/demo/security/strict-csp";
/**
 * Where browsers send violation reports, through `report-uri` alone. The newer
 * `report-to` (plus a Reporting-Endpoints header) is left out on purpose: Chrome
 * ignores report-uri whenever report-to is present, and in testing it then never
 * delivered a report-to report, relative endpoint or absolute. report-uri is
 * deprecated but every current browser still sends it, immediately.
 */
export const CSP_REPORT_PATH = "/api/csp-report";

/** Stands in for this deployment's CMS origin (NEXT_PUBLIC_OPTIMIZELY_CMS_URL). */
export const CMS_ORIGIN = "<cms-origin>";

export type CspDirective =
  | "default-src"
  | "script-src"
  | "style-src"
  | "img-src"
  | "font-src"
  | "connect-src"
  | "frame-src"
  | "frame-ancestors"
  | "object-src"
  | "base-uri"
  | "form-action"
  | "manifest-src";

export type CspSource = {
  directive: CspDirective;
  source: string;
  product: string;
  why: string;
  /** Sent only by `next dev`, or only on Vercel preview deployments. */
  only?: "dev" | "vercel-preview";
};

const GA4 = "GA4 / GTM";
const WX = "Web Experimentation";
const VB = "Visual Builder";

// Every source of both policies, with the reason it is there. The site-wide
// policy (next.config.ts) and the strict one (middleware) are built from this list,
// and /demo/security renders it as its table, so the three cannot drift apart.
//
// The site-wide policy keeps script-src 'unsafe-inline', because Next streams each
// page's data as inline scripts that differ per page, and the only replacement - a
// per-request nonce - makes every page dynamic. Neither policy allows
// 'unsafe-eval' (outside `next dev`) or 'strict-dynamic', and every third-party
// host is named exactly, so a compromised third-party script cannot load a second
// script from an unknown host, or send what it reads to one.
export const CSP_SOURCES: CspSource[] = [
  { directive: "default-src", source: "'self'", product: "Baseline", why: "Anything a directive below does not cover may only come from this site." },

  { directive: "script-src", source: "'self'", product: "Next.js", why: "The app's own bundles under /_next/static." },
  { directive: "script-src", source: "'unsafe-inline'", product: "Next.js", why: "Next streams each page's data as inline scripts that differ per page. Only a per-request nonce replaces this, and a nonce makes every page dynamic. The strict demo route shows that trade." },
  { directive: "script-src", source: "'unsafe-eval'", product: "React", why: "React's development build evaluates strings for its debugging overlay.", only: "dev" },
  { directive: "script-src", source: "https://cdn.optimizely.com", product: WX, why: "The WX snippet, loaded blocking in <head>, and its preview client." },
  { directive: "script-src", source: "https://app.optimizely.com", product: WX, why: "The WX visual editor, which the snippet loads only when the site is opened from the editor." },
  { directive: "script-src", source: "https://www.googletagmanager.com", product: GA4, why: "gtag.js and the GTM container." },
  { directive: "script-src", source: "https://d1igp3oop3iho5.cloudfront.net", product: "ODP", why: "The ODP web SDK (zaius-min.js)." },
  { directive: "script-src", source: CMS_ORIGIN, product: VB, why: "communicationinjector.js, which /preview loads so the CMS editor can drive on-page editing." },
  { directive: "script-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "style-src", source: "'self'", product: "Next.js", why: "The compiled Tailwind stylesheet." },
  { directive: "style-src", source: "'unsafe-inline'", product: "Site + WX", why: "style attributes: Shiki code tokens, next/image fill, CMS-picked banner colours and WX variation CSS. An attribute cannot carry a nonce, so even the strict route keeps this." },
  { directive: "style-src", source: "https://cdn.optimizely.com", product: WX, why: "Stylesheets the snippet injects." },
  { directive: "style-src", source: "https://app.optimizely.com", product: WX, why: "The WX visual editor's own styles." },
  { directive: "style-src", source: CMS_ORIGIN, product: VB, why: "Styles for the on-page editing overlay." },
  { directive: "style-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "img-src", source: "'self'", product: "Next.js", why: "Optimized images from /_next/image and files in /public." },
  { directive: "img-src", source: "data:", product: "Site", why: "Inline SVG icons and next/image blur placeholders." },
  { directive: "img-src", source: "https://*.cms.optimizely.com", product: "CMS", why: "CMS media rendered with a plain <img>, including preview-token URLs in edit mode." },
  { directive: "img-src", source: "https://*.cmp.optimizely.com", product: "DAM", why: "DAM renditions from the CMP CDN." },
  { directive: "img-src", source: "https://cdn.optimizely.com", product: WX, why: "Images used by WX changes." },
  { directive: "img-src", source: "https://api.zaius.com", product: "ODP", why: "The ODP tracking pixel (zaius.gif)." },
  { directive: "img-src", source: "https://*.google-analytics.com", product: GA4, why: "GA4 collect pixels." },
  { directive: "img-src", source: "https://www.googletagmanager.com", product: GA4, why: "GTM pixels." },
  { directive: "img-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },
  { directive: "img-src", source: "https://vercel.com", product: "Vercel", why: "Avatars in the Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "font-src", source: "'self'", product: "Next.js", why: "next/font self-hosts every face at build time, so no font CDN is needed." },
  { directive: "font-src", source: "https://app.optimizely.com", product: WX, why: "The WX visual editor's fonts." },
  { directive: "font-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },
  { directive: "font-src", source: "https://assets.vercel.com", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "connect-src", source: "'self'", product: "Next.js", why: "Route handlers under /api, RSC navigations and, in dev, the HMR socket." },
  { directive: "connect-src", source: "https://logx.optimizely.com", product: "FX + WX", why: "Impression and conversion events (fetch and sendBeacon)." },
  { directive: "connect-src", source: "https://eu.logx.optimizely.com", product: "FX + WX", why: "The same events for an account in the EU data region, as this one is. Found by the report-only run." },
  { directive: "connect-src", source: "https://cdn.optimizely.com", product: "FX", why: "The datafile the browser SDK fetches." },
  { directive: "connect-src", source: "https://rum.optimizely.com", product: WX, why: "WX's real-user performance beacon." },
  { directive: "connect-src", source: "https://app.optimizely.com", product: WX, why: "The WX visual editor talking to its app." },
  { directive: "connect-src", source: "https://cg.optimizely.com", product: "Graph", why: "Search click tracking: the browser pings the _track URL Graph returned." },
  { directive: "connect-src", source: "https://api.zaius.com", product: "ODP", why: "The web SDK's event and profile calls." },
  { directive: "connect-src", source: "https://d2umq2feo9f3jv.cloudfront.net", product: "ODP", why: "The web SDK's tracking rules (_rules.json)." },
  { directive: "connect-src", source: "https://*.google-analytics.com", product: GA4, why: "GA4 collect calls." },
  { directive: "connect-src", source: "https://*.analytics.google.com", product: GA4, why: "GA4 collect calls." },
  { directive: "connect-src", source: "https://www.googletagmanager.com", product: GA4, why: "GTM's own requests." },
  { directive: "connect-src", source: CMS_ORIGIN, product: VB, why: "The on-page editing overlay talking to the CMS." },
  { directive: "connect-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },
  { directive: "connect-src", source: "wss://ws-us3.pusher.com", product: "Vercel", why: "Live comments in the Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "frame-src", source: "https://www.googletagmanager.com", product: GA4, why: "GTM's <noscript> iframe." },
  { directive: "frame-src", source: "https://a4871554132082688.cdn.optimizely.com", product: WX, why: "The snippet's cross-domain iframe, on the WX account's own host. A snippet from another account needs that account's a<id> host." },
  { directive: "frame-src", source: "https://vercel.live", product: "Vercel", why: "The Vercel toolbar on preview deployments.", only: "vercel-preview" },

  { directive: "frame-ancestors", source: "'self'", product: "Baseline", why: "Only this site, and the two editors below, may put it in an iframe (clickjacking)." },
  { directive: "frame-ancestors", source: CMS_ORIGIN, product: VB, why: "Visual Builder and on-page editing frame the site from the CMS." },
  { directive: "frame-ancestors", source: "https://app.optimizely.com", product: WX, why: "The WX visual editor frames the site." },

  { directive: "object-src", source: "'none'", product: "Baseline", why: "No plugins (<object>, <embed>): nothing legitimate loads that way anymore." },
  { directive: "base-uri", source: "'self'", product: "Baseline", why: "Stops an injected <base> tag from re-pointing every relative URL on the page." },
  { directive: "form-action", source: "'self'", product: "Baseline", why: "A native form can only post to this site. CMS forms post with fetch, which connect-src governs." },
  { directive: "manifest-src", source: "'self'", product: "Baseline", why: "Web app manifests from this site only." },
];

/**
 * Directives that stay ENFORCED while the rest of the policy is report-only.
 * frame-ancestors is not optional here: browsers ignore it in a report-only
 * policy, so moving it there would silently drop clickjacking protection.
 */
const ALWAYS_ENFORCED: CspDirective[] = ["frame-ancestors", "object-src", "base-uri"];

export type CspMode = "report-only" | "enforce";

/** CSP_MODE=enforce turns the full policy on; anything else only reports violations. */
export function cspMode(): CspMode {
  return process.env.CSP_MODE === "enforce" ? "enforce" : "report-only";
}

const isDev = () => process.env.NODE_ENV !== "production";

/** CSP_SOURCES as this deployment sends them: CMS origin filled in, `only` entries resolved. */
export function resolvedCspSources(): CspSource[] {
  const cmsUrl = getCmsUrl();
  const vercelPreview = process.env.VERCEL_ENV === "preview";
  return CSP_SOURCES.filter((s) => {
    if (s.only === "dev") return isDev();
    if (s.only === "vercel-preview") return vercelPreview;
    // An unset CMS URL used to leave `frame-ancestors 'self' ` with a dangling space.
    return s.source !== CMS_ORIGIN || cmsUrl !== "";
  }).map((s) => (s.source === CMS_ORIGIN ? { ...s, source: cmsUrl } : s));
}

type BuildOptions = {
  /** Keep only these directives; or drop them with `exclude`. */
  include?: CspDirective[];
  exclude?: CspDirective[];
  /** Replace script-src's 'unsafe-inline' with this nonce and these hash sources. */
  strict?: { nonce: string; hashes: string[] };
};

export function buildCsp({ include, exclude, strict }: BuildOptions = {}): string {
  const byDirective = new Map<CspDirective, string[]>();
  for (const { directive, source } of resolvedCspSources()) {
    if (include && !include.includes(directive)) continue;
    if (exclude?.includes(directive)) continue;
    if (strict && directive === "script-src" && source === "'unsafe-inline'") continue;
    byDirective.set(directive, [...(byDirective.get(directive) ?? []), source]);
  }
  if (strict) {
    const script = byDirective.get("script-src") ?? [];
    byDirective.set("script-src", [script[0] ?? "'self'", `'nonce-${strict.nonce}'`, ...strict.hashes, ...script.slice(1)]);
  }

  const parts = [...byDirective].map(([directive, sources]) => `${directive} ${sources.join(" ")}`);
  // Only in a whole, enforced policy: browsers ignore it in report-only and warn.
  // Not in dev either, where it would upgrade http://localhost subresources and break them.
  if (!include && !exclude && !isDev()) parts.push("upgrade-insecure-requests");
  parts.push(`report-uri ${CSP_REPORT_PATH}`);
  return parts.join("; ");
}

type Header = { key: string; value: string };

/** The CSP headers next.config.ts sends on every route except STRICT_CSP_DEMO_PATH. */
export function cspHeaders(mode: CspMode = cspMode()): Header[] {
  if (mode === "enforce") return [{ key: "Content-Security-Policy", value: buildCsp() }];
  return [
    { key: "Content-Security-Policy", value: buildCsp({ include: ALWAYS_ENFORCED }) },
    { key: "Content-Security-Policy-Report-Only", value: buildCsp({ exclude: ALWAYS_ENFORCED }) },
  ];
}

export type SecurityHeader = Header & { why: string };

export const SECURITY_HEADERS: SecurityHeader[] = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
    why: "The browser trusts the declared Content-Type instead of guessing, so an uploaded text file can never run as a script.",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
    why: "Other sites see only this origin, never the path or query string, so a signed preview link cannot leak through a Referer header.",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    why: "Switches off powerful browser features nothing here uses, for this page and every script on it, the third-party ones included. The branch finder geocodes on the server.",
  },
];

let headScriptHashes: Promise<string[]> | undefined;

async function sha256Source(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return `'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
}

/**
 * The strict policy for STRICT_CSP_DEMO_PATH. The nonce covers Next's own inline
 * scripts (Next reads it back out of the request's CSP header and stamps it on
 * them); the hashes cover the layout's head scripts, so layout.tsx never has to
 * read headers() - which would make every route on the site dynamic.
 */
export async function buildStrictCsp(nonce: string): Promise<string> {
  headScriptHashes ??= Promise.all(Object.values(HEAD_SCRIPTS).map(sha256Source));
  return buildCsp({ strict: { nonce, hashes: await headScriptHashes } });
}
