import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createInstance,
  createStaticProjectConfigManager,
  OptimizelyDecideOption,
} from "@optimizely/optimizely-sdk/universal";
import { fetchDatafile } from "@/lib/optimizely/datafile";

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

  // Skip API routes, preview, demo pages, variation-rewritten paths, and Next.js 16 .segments/ prefetch URLs (rewriting them produces a cached 404).
  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.startsWith("/preview")) return response;
  if (/^\/demo(\/|$)/.test(request.nextUrl.pathname)) return response;
  if (request.nextUrl.pathname.includes(VARIATION_MARKER)) return response;
  if (request.nextUrl.pathname.includes(".segments/")) return response;

  try {
    const datafile = await fetchDatafile(3000);
    if (!datafile) return response;

    const ua = request.headers.get("user-agent") ?? "";
    const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
    // Strip any :port so this matches window.location.hostname on the client.
    const hostname = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
    const demoPersona = request.cookies.get("demo_persona")?.value;
    const bucketingId = request.cookies.get("demo_bucketing_id")?.value;

    const client = createInstance({
      projectConfigManager: createStaticProjectConfigManager({ datafile }),
      requestHandler: noOpRequestHandler,
    });

    const ctx = client.createUserContext(userId, {
      device,
      hostname,
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
