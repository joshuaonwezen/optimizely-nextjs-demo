import { readCookie } from "@/lib/tracking/cookies";
import { DEMO_BUCKETING_ID_COOKIE, DEMO_PAGE_VIEWS_COOKIE, DEMO_PERSONA_COOKIE } from "./cookieNames";

// One source for the visitor attributes every FX decision and event uses. Middleware,
// server components and the browser must send identical attributes: if they drift,
// the browser can bucket a visitor into a different variation than the server
// rendered and record a ghost impression. Dependency-free so middleware can import it.

export type FxAttributes = Record<string, string | number | boolean | null | undefined>;

export {
  VISITOR_ID_COOKIE,
  DEMO_PERSONA_COOKIE,
  DEMO_BUCKETING_ID_COOKIE,
  DEMO_PAGE_VIEWS_COOKIE,
} from "./cookieNames";

type CookieReader = (name: string) => string | null | undefined;

/** The public host of a request (proxies set x-forwarded-host). May include a port. */
export function requestHost(headers: { get(name: string): string | null }): string {
  return headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
}

export function buildFxAttributes({
  userAgent,
  host,
  cookie,
}: {
  userAgent: string;
  host: string;
  cookie: CookieReader;
}): FxAttributes {
  const persona = cookie(DEMO_PERSONA_COOKIE);
  const pageViews = cookie(DEMO_PAGE_VIEWS_COOKIE);
  return {
    device: /mobile|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop",
    // Port stripped so the server value matches window.location.hostname.
    hostname: host.split(":")[0],
    logged_in: !!cookie(DEMO_BUCKETING_ID_COOKIE),
    ...(persona ? { persona } : {}),
    ...(pageViews ? { page_views: Number(pageViews) } : {}),
  };
}

/** buildFxAttributes for the current browser page. Client-only. */
export function browserFxAttributes(): FxAttributes {
  return buildFxAttributes({
    userAgent: navigator.userAgent,
    host: window.location.hostname,
    cookie: readCookie,
  });
}
