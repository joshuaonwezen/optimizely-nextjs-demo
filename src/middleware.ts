import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createInstance,
  createStaticProjectConfigManager,
  OptimizelyDecideOption,
} from "@optimizely/optimizely-sdk/universal";

const DATAFILE_URL = `https://cdn.optimizely.com/datafiles/${process.env.OPTIMIZELY_FX_SDK_KEY}.json`;
export const VARIATION_MARKER = "__v_";
export const FLAG_VAR_SEP = "--";

const noOpRequestHandler = {
  makeRequest: () => ({
    abort: () => {},
    responsePromise: Promise.resolve({ statusCode: 200, body: "", headers: {} }),
  }),
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const existingId = request.cookies.get("optimizelyEndUserId")?.value;
  const userId = existingId ?? crypto.randomUUID();
  if (!existingId) {
    response.cookies.set("optimizelyEndUserId", userId, {
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      path: "/",
      secure: false,  // must be readable over HTTP (localhost) and by browser JS
    });
  }

  // Skip API routes, preview, demo pages, and already-rewritten variation paths.
  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.startsWith("/preview")) return response;
  if (/^\/demo(\/|$)/.test(request.nextUrl.pathname)) return response;
  if (request.nextUrl.pathname.includes(VARIATION_MARKER)) return response;

  try {
    const datafileRes = await fetch(DATAFILE_URL, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) } as RequestInit);
    if (!datafileRes.ok) return response;
    const datafile = await datafileRes.text();

    const ua = request.headers.get("user-agent") ?? "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    const demoPersona = request.cookies.get("demo_persona")?.value;
    const bucketingId = request.cookies.get("demo_bucketing_id")?.value;

    const client = createInstance({
      projectConfigManager: createStaticProjectConfigManager({ datafile }),
      requestHandler: noOpRequestHandler,
    });

    const ctx = client.createUserContext(userId, {
      device,
      logged_in: !!bucketingId,
      ...(demoPersona ? { persona: demoPersona } : {}),
    });
    if (!ctx) return response;

    const decisions = ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
    // Only flags that drive CMS content (variation variable cms_flag === true) create
    // cache routes. Component-level experiments resolve client-side and are excluded
    // here so they don't fragment the ISR cache key. Sorted by variationKey for a
    // stable cache key.
    const activeDecisions = Object.values(decisions)
      .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
      .filter((d) => d.variables?.cms_flag === true)
      .sort((a, b) => (a.variationKey as string).localeCompare(b.variationKey as string));

    if (activeDecisions.length === 0) return response;

    // Append one __v_ segment per active decision encoding flagKey--variationKey.
    // e.g. /savings → /savings/__v_homepage--business
    // The page reads flagKey from the segment — no extra SDK call needed client-side.
    const url = request.nextUrl.clone();
    const variationSuffix = activeDecisions
      .map((d) => `${VARIATION_MARKER}${d.flagKey}${FLAG_VAR_SEP}${d.variationKey}`)
      .join("/");
    url.pathname = url.pathname.replace(/\/$/, "") + `/${variationSuffix}`;
    return NextResponse.rewrite(url, { headers: response.headers });
  } catch {
    // Never fail a request due to FX errors.
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
};
