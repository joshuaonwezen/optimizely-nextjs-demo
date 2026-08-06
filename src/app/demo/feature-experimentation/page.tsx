import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { type FxDecision } from "@/lib/optimizely/experimentation";
import { getOptimizelyUser } from "@/lib/optimizely/user";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";

export const dynamic = "force-dynamic";

const userTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/user.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Feature Experimentation Demo",
};

// Small lucide-style icons for the Serve pipeline; inherit the chip's accent via currentColor.
const ICON_ZAP = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ICON_DATABASE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);
const ICON_ACTIVITY = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const CONNECTION_GRAPH_SNIPPET = `# The variation key becomes a Graph filter. For a visitor bucketed into "business":
query {
  _Content(
    where: { _metadata: { url: { default: { eq: "/en/" } } } }
    variation: { include: SOME, value: ["business"], includeOriginal: true }
  ) {
    items {
      _metadata { variation }   # "business", or null for the base page
    }
  }
}`;


const BUCKETING_SNIPPET = `// src/components/FxBucketingEvent.tsx
// flagKey is passed in from the page - it was encoded in the URL by middleware:
//   /savings → /savings/__v_homepage--business
// extractVariations() in page.tsx parses it back out.
// No decideAll() here - the flagKey is already known from the route.

"use client";
export function FxBucketingEvent({ flagKey }: { flagKey: string }) {
  useEffect(() => {
    const userId = getCookie("optimizelyEndUserId");
    if (!userId) return;
    void getOptimizelyBrowserClient().then((client) => {
      if (!client) return;
      const ua = navigator.userAgent;
      const device = /mobile|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop";
      const persona = getCookie("demo_persona");
      // Attributes MUST mirror src/middleware.ts (which produced the served
      // variation) - including logged_in - or the impression can land on a
      // different variation than the one that was rendered.
      const ctx = client.createUserContext(userId, {
        device,
        hostname: window.location.hostname,
        logged_in: !!getCookie("demo_bucketing_id"),
        ...(persona ? { persona } : {}),
      });
      ctx?.decide(flagKey, []); // fire bucketing event for this flag only
    });
  }, [flagKey]);
  return null;
}

// src/app/[[...slug]]/page.tsx
// flagKey comes from the URL segment, not from a client-side SDK call.
// flagVariations = [{ flagKey: "homepage", variationKey: "business" }]
const { cleanSlug, activeVariations, flagVariations } = extractVariations(slug);
const servedVariation = page._metadata?.variation ?? null;
const servedFlagKey = flagVariations.find((fv) => fv.variationKey === servedVariation)?.flagKey ?? null;

return (
  <>
    <OptimizelyComponent content={page} />
    {servedFlagKey && <FxBucketingEvent flagKey={servedFlagKey} />}
  </>
);`;


const DECISION_SNIPPET = `import { getOptimizelyUser } from "@/lib/optimizely/user";

export default async function MyPage() {
  const user = await getOptimizelyUser();

  // Evaluate without firing an impression (default: DISABLE_DECISION_EVENT)
  const decision = user.decide("hero_copy");
  if (!decision.enabled) return null;

  // Once you know the variation will be shown, fire the impression:
  void user.decide("hero_copy", []);

  // Variables come back typed - you cast to the type you expect
  const headline = decision.variables.headline as string;
  const subheadline = decision.variables.subheadline as string;
  return <Hero headline={headline} subheadline={subheadline} variation={decision.variationKey} />;
}`;

const VARIATIONS_SNIPPET = `// src/app/[[...slug]]/page.tsx
// Middleware rewrites: /savings → /savings/__v_homepage--business
//   VARIATION_MARKER = "__v_"   FLAG_VAR_SEP = "--"
// Both flagKey and variationKey are encoded in the URL segment so the page
// knows which flag to fire the bucketing event for - no extra SDK call needed.
import { VARIATION_MARKER, FLAG_VAR_SEP } from "@/middleware";

function extractVariations(slug) {
  const cleanSlug = slug?.filter((s) => !s.startsWith(VARIATION_MARKER));
  const flagVariations = slug
    ?.filter((s) => s.startsWith(VARIATION_MARKER))
    .map((s) => {
      const [flagKey, variationKey] = s.slice(VARIATION_MARKER.length).split(FLAG_VAR_SEP);
      return { flagKey, variationKey };
    }) ?? [];
  return {
    cleanSlug,
    activeVariations: flagVariations.map((fv) => fv.variationKey), // for Graph filter
    flagVariations,                                                  // for bucketing event
  };
}

async function CmsPage({ params }) {
  const { slug } = await params;
  const { cleanSlug, activeVariations, flagVariations } = extractVariations(slug);

  // Pass variation keys to Graph - same filter as always, now sourced from URL not cookies
  const variationOption = activeVariations.length > 0
    ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
    : undefined;

  const client = getClient();
  const items = await client.getContentByPath(\`/\${cleanSlug.join("/")}/\`, variationOption);
  const page = items.find((i) => activeVariations.includes(i._metadata?.variation)) ?? items[0];

  // Look up flagKey by the variationKey Graph actually served
  const servedVariation = page._metadata?.variation ?? null;
  const servedFlagKey = flagVariations.find((fv) => fv.variationKey === servedVariation)?.flagKey ?? null;

  return (
    <>
      <OptimizelyComponent content={page} />
      {servedFlagKey && <FxBucketingEvent flagKey={servedFlagKey} />}
    </>
  );
}`;

const GRAPH_QUERY_SNIPPET = `# Theoretical GraphQL generated by getContentByPath("/en/", variationFilter)
# when the user is bucketed into the "personal" variation:

query {
  _Content(
    where: {
      _metadata: { url: { default: { eq: "/en/" } } }
    }
    variation: {
      include: SOME
      value: ["personal"]
      includeOriginal: true   # always include the base - safe fallback for non-experiment users
    }
    limit: 10
  ) {
    items {
      _metadata {
        key
        version
        variation       # "personal" | null (base version)
        url { default }
      }
      ... on HomePage {
        composition { ... }
      }
    }
  }
}

# Graph returns TWO items:
#   items[0] → base homepage          (variation: null)
#   items[1] → "personal" variation   (variation: "personal")
#
# The code picks items[1] because it matches activeVariations.
# If no matching CMS variation exists, includeOriginal: true ensures
# items[0] (the base) is returned - experiment is safe to deploy before
# editors create any CMS variations.`;

const MIDDLEWARE_SNIPPET = `// src/middleware.ts
import { createInstance, createStaticProjectConfigManager, OptimizelyDecideOption }
  from "@optimizely/optimizely-sdk/universal";

export const VARIATION_MARKER = "__v_";
const MAX_CMS_VARIATIONS = 3; // safety backstop; cms_route is the real control

// An experiment declares its target route via the cms_route variation variable.
// "" / undefined = all routes, "/*" = all, "/products/*" = prefix, "/x" = exact.
function routeMatches(pathname, cmsRoute) {
  if (!cmsRoute?.trim()) return true;
  const path = pathname.replace(/\\/$/, "") || "/";
  return cmsRoute.split(",").some((raw) => {
    const entry = raw.trim();
    if (entry === "/*") return true;
    if (entry.endsWith("/*")) {
      const prefix = entry.slice(0, -2).replace(/\\/$/, "") || "/";
      return path === prefix || path.startsWith(prefix + "/");
    }
    return path === (entry.replace(/\\/$/, "") || "/");
  });
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set a stable visitor ID (not httpOnly - browser SDK reads it for bucketing events).
  const userId = request.cookies.get("optimizelyEndUserId")?.value ?? crypto.randomUUID();
  if (!request.cookies.get("optimizelyEndUserId")) {
    response.cookies.set("optimizelyEndUserId", userId, {
      maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/",
    });
  }

  // Skip API routes and already-rewritten paths.
  if (request.nextUrl.pathname.startsWith("/api/")) return response;
  if (request.nextUrl.pathname.includes(VARIATION_MARKER)) return response;

  // Fetch datafile with 60s edge cache (Vercel CDN caches this automatically).
  const datafile = await fetch(DATAFILE_URL, { next: { revalidate: 60 } }).then((r) => r.text());

  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile }),
    requestHandler: noOpRequestHandler, // no HTTP needed - static config only
  });

  const ctx = client.createUserContext(userId, { device, hostname, logged_in, persona });
  const decisions = ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);

  // Keep only CMS-content experiments (cms_flag) whose cms_route targets THIS path.
  // A visitor may match many experiments across the site; only the one authored on
  // the current page should be applied here - this is what keeps the cache clean.
  // Sorted by variationKey for a stable ISR cache key, then capped as a backstop.
  const activeDecisions = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .filter((d) => d.variables?.cms_flag === true)
    .filter((d) => routeMatches(request.nextUrl.pathname, d.variables?.cms_route))
    .sort((a, b) => (a.variationKey as string).localeCompare(b.variationKey as string))
    .slice(0, MAX_CMS_VARIATIONS);

  if (activeDecisions.length === 0) return response;

  // Rewrite URL: /savings → /savings/__v_homepage--business
  // Each segment encodes flagKey--variationKey so the page knows which flag fired.
  // The user sees /savings in the browser - the rewrite is transparent.
  // Next.js catches each rewritten path as a separate ISR cache entry.
  const url = request.nextUrl.clone();
  const variationSuffix = activeDecisions
    .map((d) => \`__v_\${d.flagKey}--\${d.variationKey}\`)
    .join("/");
  url.pathname = url.pathname.replace(/\\/$/, "") + \`/\${variationSuffix}\`;
  return NextResponse.rewrite(url, { headers: response.headers });
}`;

const USER_LIB_SNIPPET = `// src/lib/optimizely/user.ts
import { cache } from "react";
import { OptimizelyDecideOption } from "@optimizely/optimizely-sdk";
import { getOptimizelyClient } from "./experimentation";
import { getVisitorContext } from "./visitor";

// cache() scopes to a single HTTP request's render tree.
// Every component that calls getOptimizelyUser() shares one user context.
// 1,000 concurrent visitors → 1,000 independent contexts, nothing shared.
export const getOptimizelyUser = cache(async () => {
  const [client, { userId, attributes, bucketingId }] = await Promise.all([
    getOptimizelyClient(), // one SDK instance per request (React cache() + 60s Next.js fetch cache)
    getVisitorContext(),    // reads: optimizelyEndUserId cookie, User-Agent → device, demo cookies
  ]);

  if (!client) return noOpUser; // FX unreachable → all decide() calls return { enabled: false }

  const ctx = client.createUserContext(userId, attributes);
  return {
    userId,
    bucketingId,
    //
    // decide(flagKey)                → DISABLE_DECISION_EVENT: flag evaluated, no impression fired
    // decide(flagKey, [])            → no options → impression fires, registers user in FX results
    // decide(flagKey, {bucketingId}) → override bucketing ID for account-level experiments
    // decide(flagKey, {attributes})  → merge extra attributes for this call only
    //
    decide(flagKey: string, opts?: OptimizelyDecideOption[] | DecideOpts): FxDecision { /* ... */ },
    decideAll(): Record<string, FxDecision> {
      // Always DISABLE_DECISION_EVENT - evaluate all flags without recording anything.
      return ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
    },
  };
});`;

const WRAPPER_VS_SDK_SNIPPET = `// ❌ Using the FX SDK directly - don't do this in server components
import { createInstance } from "@optimizely/optimizely-sdk";

export default async function MyPage() {
  const res = await fetch(DATAFILE_URL);         // fetched fresh every render
  const client = createInstance({ datafile: await res.text() });
  const ctx = client?.createUserContext(???);    // where does userId come from?
  const decision = ctx?.decide("my_flag");       // no impression control
}

// ✅ Using the wrapper - one function call, everything resolved
import { getOptimizelyUser } from "@/lib/optimizely/user";

export default async function MyPage() {
  const user = await getOptimizelyUser();

  // userId + device + persona attributes come from cookies automatically.
  // SDK instance is memoised per request - datafile not re-fetched.
  // DISABLE_DECISION_EVENT by default - impression not fired yet.
  const decision = user.decide("my_flag");
  if (!decision.enabled) return null;

  // Now the variation will be rendered - fire the impression.
  void user.decide("my_flag", []);

  return <Variant variables={decision.variables} />;
}`;


function FlagCard({ decision }: { decision: FxDecision }) {
  const hasVars = Object.keys(decision.variables).length > 0;
  return (
    <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <code className="font-mono text-sm font-semibold text-on-surface break-all">
          {decision.flagKey}
        </code>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            decision.enabled
              ? "bg-green-100 text-green-800"
              : "bg-surface-low text-on-surface-variant"
          }`}
        >
          {decision.enabled ? "enabled" : "off"}
        </span>
      </div>
      {decision.variationKey && (
        <span className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-brand/10 text-brand">
          variation: {decision.variationKey}
        </span>
      )}
      {hasVars && (
        <pre className="bg-surface-low rounded-xl p-3 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
          <code>{JSON.stringify(decision.variables, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}

function HeroCopyDemo({ decision }: { decision: FxDecision | undefined }) {
  if (!decision?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-ghost-border bg-surface-lowest p-8 text-center">
        <p className="text-sm font-mono text-on-surface-variant mb-1">hero_copy</p>
        <p className="text-on-surface-variant text-sm">
          Flag is <strong>off</strong> - enable it in the FX dashboard to see the live hero copy variation.
        </p>
      </div>
    );
  }

  const headline = (decision.variables.headline as string) || "Banking made simple";
  const subheadline = (decision.variables.subheadline as string) || "";
  const isChallenger = decision.variationKey === "challenger";

  return (
    <div
      className={`rounded-2xl p-8 ${
        isChallenger ? "bg-gradient-brand" : "bg-surface-lowest border border-ghost-border"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
          isChallenger ? "text-on-brand opacity-70" : "text-on-surface-variant"
        }`}
      >
        variation: {decision.variationKey}
      </p>
      <h3
        className={`font-display text-2xl font-bold mb-3 ${
          isChallenger ? "text-on-brand" : "text-on-surface"
        }`}
      >
        {headline}
      </h3>
      {subheadline && (
        <p
          className={`text-sm leading-relaxed ${
            isChallenger ? "text-on-brand opacity-90" : "text-on-surface-variant"
          }`}
        >
          {subheadline}
        </p>
      )}
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-on-brand text-sm font-bold font-display">
        {number}
      </div>
      <div className="pt-1 flex-1">
        <h3 className="font-display font-semibold text-on-surface mb-1">{title}</h3>
        <div className="text-sm text-on-surface-variant leading-relaxed">{children}</div>
      </div>
    </div>
  );
}


function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-brand/10 text-brand border border-brand/20">
      {children}
    </span>
  );
}

// Phase eyebrow used to head each half of the lifecycle (Configure / Serve).
function PhaseHeader({ label, caption }: { label: string; caption: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-xs font-mono font-semibold text-brand uppercase tracking-widest whitespace-nowrap">{label}</span>
      <span className="hidden sm:inline text-xs text-on-surface-variant whitespace-nowrap">{caption}</span>
      <span className="flex-1 h-px bg-ghost-border" />
    </div>
  );
}


const BUCKETING_ID_SNIPPET = `import { getOptimizelyUser } from "@/lib/optimizely/user";
import { getVisitorContext } from "@/lib/optimizely/visitor";

export default async function MyPage() {
  const user = await getOptimizelyUser();
  const { bucketingId } = await getVisitorContext();

  // Normal decision - bucketed by the visitor's stable userId
  const decision = user.decide("hero_copy");

  // Account-level decision - when logged in, bucket by account ID instead.
  // All seats on the same account see the same variation.
  // userId is still used for analytics; only bucketing is overridden.
  const accountDecision = bucketingId
    ? user.decide("hero_copy", { bucketingId })
    : null;
}`;

export default async function FeatureFlagsDemoPage() {
  const user = await getOptimizelyUser();
  const { userId, attributes, bucketingId } = await getVisitorContext();
  const device = attributes.device as string;

  const decisions = user.decideAll();
  const heroCopyDecision = decisions["hero_copy"];
  const bucketedDecision = bucketingId
    ? user.decide("hero_copy", { bucketingId })
    : null;

  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  return (
    <>
      <DemoHero
        title="Feature Experimentation"
        description="Optimizely Feature Experimentation runs alongside SaaS CMS on the same platform. Flag decisions are evaluated in edge middleware - the URL is rewritten with the variation key before the page renders, enabling full ISR caching per variation. Bucketing events fire client-side after the user sees the variation, connecting A/B experiments directly to editor-created content variations."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          {["✓ Server-side decisions", "Feature flags · Experiments", "Audience targeting", "Variable delivery", "CMS Variations integration"].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              {t}
            </span>
          ))}
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* ── Architecture overview ── */}
        <section id="how-it-works">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How It All Fits Together: Configure, Then Serve <a href="#how-it-works" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The full lifecycle has two phases. <strong>Configure</strong> is one-time setup done
            entirely in the FX and CMS UIs - no code. <strong>Serve</strong> is what runs
            automatically on every page request. Once the integration code is in place, editors and
            experimenters add variations to any page without a developer ever touching the codebase.
          </p>

          {/* Configure */}
          <PhaseHeader label="Configure" caption="one-time setup in the UIs · no code" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            {[
              { n: 1, t: "Create the CMS variation", d: "In Visual Builder, add a variation and name it to match the FX variation key." },
              { n: 2, t: "Create the flag + rule", d: "In FX, create the flag and a delivery rule. Set variation variables cms_flag: true and cms_route." },
              { n: 3, t: "Create + attach audience", d: "Define an audience from SDK attributes or ODP segments and attach it to the delivery rule." },
              { n: 4, t: "Set traffic + enable", d: "Allocate traffic and turn the rule on. FX now buckets visitors." },
            ].map(({ n, t, d }) => (
              <div key={n} className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                  <span className="text-brand font-bold font-mono text-sm">{n}</span>
                </div>
                <h3 className="font-display font-semibold text-on-surface text-sm mb-1.5">{t}</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          {/* Serve - three execution contexts a dev implements: edge, server+graph, client */}
          <PhaseHeader label="Serve" caption="automatic on every request" />
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
            {[
              { n: 5, env: "Edge", icon: ICON_ZAP, accent: "bg-brand/10 text-brand", file: "src/middleware.ts", essence: "Pick the variation, put it in the URL", explain: "FX chooses which variation this visitor should see (that choice is the “decision”), and the middleware writes it into the request path so the page can be cached per variation.", code: "decideAll([DISABLE_DECISION_EVENT])\n// → { homepage: { variationKey: 'business' } }\n// rewrite: /savings → /savings/__v_homepage--business", href: "#code-middleware" },
              { n: 6, env: "Server · Graph (cached)", icon: ICON_DATABASE, accent: "bg-blue-100 text-blue-800", file: "src/app/[[...slug]]/page.tsx", essence: "Fetch the matching content from Graph", explain: "The page asks Optimizely Graph for the content variant whose name matches the chosen variation. The response is cached, so repeat visits stay fast.", code: "variation: {\n  include: 'SOME',\n  value: ['business'],\n  includeOriginal: true,\n}", href: "#code-page-route" },
              { n: 7, env: "Client", icon: ICON_ACTIVITY, accent: "bg-emerald-100 text-emerald-800", file: "src/components/FxBucketingEvent.tsx", essence: "Record that the visitor saw it", explain: "In the browser, FX logs an “impression” - the event that tells the experiment this visitor was shown this variation, so results can be measured.", code: "decide('homepage', []) // [] fires it", href: "#code-bucketing-event" },
            ].flatMap((s, i, arr) => [
              <div key={s.n} className="flex-1 min-w-0 bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${s.accent}`}>
                    {s.icon}{s.env}
                  </span>
                  <span className="w-6 h-6 rounded-lg bg-surface-low flex items-center justify-center text-on-surface-variant font-bold font-mono text-xs shrink-0">{s.n}</span>
                </div>
                <p className="text-sm font-semibold text-on-surface leading-snug">{s.essence}</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">{s.explain}</p>
                <pre className="text-[11px] font-mono bg-surface-low text-on-surface rounded-md px-2.5 py-2 overflow-x-auto"><code>{s.code}</code></pre>
                <code className="text-[11px] font-mono text-on-surface-variant break-all">{s.file}</code>
                <a href={s.href} className="mt-auto pt-1 text-xs text-brand hover:underline font-mono">→ code</a>
              </div>,
              i < arr.length - 1 ? (
                <div key={`${s.n}-arrow`} className="flex items-center justify-center text-on-surface-variant text-lg select-none rotate-90 lg:rotate-0 py-1 lg:py-0" aria-hidden="true">→</div>
              ) : null,
            ])}
          </div>
        </section>

        {/* ── CMS Variations - the connection ── */}
        <section id="cms-variations">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            CMS Variations - Connecting FX to Content <a href="#cms-variations" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            FX variation keys and CMS content variations share a single string contract.
            When Graph receives an active variation key, it looks for a CMS content variant
            with the same name and returns it. Editors create the variant in Visual Builder;
            the SDK wires it at runtime - no code change required after initial setup.
          </p>

          {/* Flow diagram - the variation key is one string living in three places */}
          <div className="bg-surface-lowest border border-brand/20 rounded-2xl p-6 mb-6">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-5">
              <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                The contract: one string, three places
              </p>
              <p className="text-xs text-on-surface-variant">this demo&apos;s homepage personalization</p>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-stretch gap-2">
              {/* 1 - FX variation key */}
              <div className="flex-1 min-w-0 bg-surface-low rounded-xl p-4 flex flex-col gap-2">
                <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">FX variation key</p>
                <p className="text-xs text-on-surface-variant">flag <code className="font-mono">homepage</code> - the SDK buckets the user into</p>
                <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-brand text-on-brand">business</span>
              </div>

              <div className="flex items-center justify-center text-on-surface-variant text-lg select-none rotate-90 lg:rotate-0 py-1 lg:py-0" aria-hidden="true">→</div>

              {/* 2 - Graph filter value */}
              <div className="flex-1 min-w-0 bg-surface-low rounded-xl p-4 flex flex-col gap-2">
                <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">Graph filter value</p>
                <p className="text-xs text-on-surface-variant font-mono">variation: {"{"} include: SOME, value: [ … ] {"}"}</p>
                <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-brand text-on-brand">business</span>
              </div>

              <div className="flex items-center justify-center text-on-surface-variant text-lg select-none rotate-90 lg:rotate-0 py-1 lg:py-0" aria-hidden="true">→</div>

              {/* 3 - CMS variation name */}
              <div className="flex-1 min-w-0 bg-brand/5 border border-brand/20 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider">CMS variation name</p>
                <p className="text-xs text-on-surface-variant">Visual Builder serves the variant named</p>
                <span className="self-start inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-brand text-on-brand">business</span>
                <p className="text-[11px] text-on-surface-variant mt-auto">or the original if no match</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mt-5">
              The same <span className="font-mono text-brand font-semibold">business</span> string is the{" "}
              <strong>only</strong> link between FX and the CMS - match it exactly (case-sensitive) and Graph serves the right variant.
            </p>
          </div>

          {/* Concrete Graph query the variation key produces */}
          <CodeBlock code={CONNECTION_GRAPH_SNIPPET} label="Graph query (business variation active)" />

          {/* Current session's variation keys → Graph */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mt-6 mb-6">
            <h3 className="font-display font-semibold text-on-surface mb-1">
              Your Variation Keys → Graph Filter
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              This is what the live page route is passing to{" "}
              <code className="bg-surface-low px-1 rounded font-mono">getContentByPath</code> for your session right now.
            </p>
            <CodeBlock
              code={activeVariations.length === 0
                ? `// No active variation keys - flags disabled, or user not bucketed into\n// any active variation. The "off" delivery rule is excluded: it returns\n// variationKey: "off" but no CMS variation named "off" exists.\nvariationOption = undefined`
                : `variationOption = {\n  variation: {\n    include: "SOME",\n    value: ${JSON.stringify(activeVariations)},\n    includeOriginal: true,\n  },\n}`}
            />
            {activeVariations.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-3">
                Enable a flag and run an experiment in the FX dashboard, then reload - your variation key will appear above and start influencing CMS content delivery.
              </p>
            )}
          </div>

          {/* Your live session - the tiles behind the filter above */}
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
            Your live session right now
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">User ID</span>
              <span className="text-sm font-mono text-on-surface">{userId.slice(0, 8)}…{userId.slice(-4)}</span>
              <span className="text-xs text-on-surface-variant">stable per browser</span>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Device</span>
              <span className="text-sm font-mono text-on-surface">{device}</span>
              <span className="text-xs text-on-surface-variant">derived from User-Agent header (no cookie)</span>
            </div>
            <div className={`rounded-xl px-5 py-4 flex flex-col gap-1 border ${bucketingId ? "bg-emerald-50 border-emerald-200" : "bg-surface-lowest border-ghost-border"}`}>
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Bucketing ID</span>
              <span className={`text-sm font-mono ${bucketingId ? "text-emerald-700" : "text-on-surface-variant"}`}>
                {bucketingId ? `${bucketingId.slice(0, 8)}…${bucketingId.slice(-4)}` : "-"}
              </span>
              <span className="text-xs text-on-surface-variant">
                {bucketingId ? "SHA-256 hash - overrides bucketing (not analytics)" : "sign in via Audience Switcher to set"}
              </span>
            </div>
            <div className="bg-surface-lowest border border-brand/30 rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Active Variations</span>
              <span className="text-sm font-mono text-on-surface">
                {activeVariations.length === 0 ? "none" : activeVariations.join(", ")}
              </span>
              <span className="text-xs text-on-surface-variant">keys passed to Graph (the filter above)</span>
            </div>
          </div>
        </section>

        {/* ── Live hero_copy demo ── */}
        <section id="live-demo">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Demo: <code className="font-mono text-2xl">hero_copy</code> <a href="#live-demo" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-2">
            This card is driven entirely by the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">hero_copy</code> flag
            and its <code className="bg-surface-low px-1 rounded text-xs font-mono">headline</code> +{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">subheadline</code> variables.
          </p>
          <div className="flex flex-wrap gap-2 mb-6 text-xs text-on-surface-variant">
            <span>Variations:</span>
            <Pill>off</Pill>
            <span>·</span>
            <Pill>control</Pill>
            <span>(product-led copy)</span>
            <span>·</span>
            <Pill>challenger</Pill>
            <span>(benefit-led copy + brand gradient)</span>
          </div>
          <HeroCopyDemo decision={heroCopyDecision} />
        </section>

        {/* ── Setup guide ── */}
        <section id="setup-guide">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Configure - Step by Step <a href="#setup-guide" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Once the integration code is in place (see below), editors can set up any number of
            content experiments without touching code. The variation key string is the only contract
            between Feature Experimentation and the CMS.
          </p>

          <div className="space-y-8 max-w-2xl">
            <Step number={1} title="Create a flag and targeting rules in Feature Experimentation">
              Create manually in the FX dashboard or via the REST API. This demo uses flag{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">homepage</code> with two
              targeted-delivery rules, each serving 100% of its audience:{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code> (audience: <code className="bg-surface-low px-1 rounded font-mono text-xs">persona == &quot;business&quot;</code>) and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> (audience: <code className="bg-surface-low px-1 rounded font-mono text-xs">persona == &quot;personal&quot;</code>).
              Visitors matching neither audience fall through to the default <code className="bg-surface-low px-1 rounded font-mono text-xs">off</code> variation and see the base homepage. The{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code> attribute is set from the{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">demo_persona</code> cookie by the Audience Switcher.
              On each variation, set two variation variables:{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_flag: true</code> (marks this as a CMS-content experiment the edge should route) and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> (the path the variation targets, e.g.{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;/&quot;</code> for the homepage, or{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">&quot;/products/*&quot;</code> for a section). The middleware only applies a
              variation whose <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> matches the current page, so you can run many CMS
              experiments across the site without them colliding or fragmenting each other&apos;s cache. Leave{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> unset to apply everywhere.
            </Step>

            <Step number={2} title="Create variations in Visual Builder, then set their compositions">
              Open the homepage in the CMS Visual Builder. In the right-hand panel, click{" "}
              <strong>Add variation</strong>. Create two variations named exactly{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>{" "}
              (case-sensitive - must match the FX variation keys exactly). Each becomes a new draft version in the CMS.
              Edit each variation&apos;s composition in Visual Builder and publish it - or discover the version numbers via{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">GET /content/{"{key}"}/versions</code>{" "}
              and PATCH them programmatically (see the note below).
            </Step>

            <Callout variant="warning">
              <strong>CMS variations must be created in Visual Builder - the Management API cannot create them.</strong>{" "}
              The <code className="bg-surface-low px-1 rounded font-mono text-xs">variation</code> field
              exists in Graph&apos;s schema but is silently ignored by the Management API on write.
              However, once created in Visual Builder each variation becomes a new draft{" "}
              <strong>version</strong> - you can discover the version number via{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">GET /content/{"{key}"}/versions</code>{" "}
              and PATCH it with the correct composition + <code className="bg-surface-low px-1 rounded font-mono text-xs">status: &quot;published&quot;</code>.
            </Callout>

            <Step number={3} title="Validate with the Audience Switcher">
              Use the floating pill in the bottom-right corner to preview each variation instantly -
              no waiting for FX bucketing. Select <strong>Business Customer</strong>; the homepage should
              show &ldquo;Banking built for business&rdquo; once the CMS variation exists.
            </Step>

            <Step number={4} title="Enable the flag and start the experiment">
              Turn on the flag and launch the experiment in the FX dashboard. FX handles traffic
              allocation and bucketing; Graph handles content delivery. Analytics, winner declaration,
              and rollout happen entirely in the FX dashboard - no code changes needed.
            </Step>

            <Step number={5} title="Validate the experiment in your own app">
              With a variation created and the flag live, any visitor bucketed into it is served the matching
              CMS variant automatically - no per-page code. In your own app, confirm it end to end: check the{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">__v_</code> segment on the rewritten request,
              the served content, and the participant count in your FX results. FX owns analytics, winner declaration,
              and rollout from here.
            </Step>
          </div>
        </section>

        {/* ── Audience targeting ── */}
        <section id="audience-targeting">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Audience Targeting <a href="#audience-targeting" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            An audience attached to a delivery rule (step 3) can be backed two ways:{" "}
            <strong>SDK attributes</strong> passed at decision time, or <strong>ODP segments</strong> the
            visitor already qualifies for. Both are matched on the server - the browser never knows which
            audience it was matched to. Either way the rule resolves to a variation key, and everything
            downstream (Graph filter, CMS variant, impression) is identical.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-brand/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-display font-semibold text-on-surface">Attribute-based audiences</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">this demo</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Attributes like <code className="bg-surface-low px-1 rounded font-mono text-xs">device</code>,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code>, and{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in</code> are collected by{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code> (cookies + headers) and
                passed into the decision. FX audience conditions match against them at bucketing time.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">ODP segment audiences</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                An FX audience can also be defined as membership in an{" "}
                <strong>ODP segment</strong> (built from behavioural + profile data in the Optimizely Data
                Platform). Server-side,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">queryOdpSegments(userId)</code> in{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">src/lib/optimizely/odp.ts</code> resolves the
                visitor&apos;s qualified segments; those feed the FX decision the same way attributes do. See{" "}
                <Link href="/demo/personalization" className="text-brand hover:underline">Personalization</Link> and{" "}
                <Link href="/demo/odp" className="text-brand hover:underline">ODP</Link> for the full walkthrough.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">Built-in Attributes</h3>
              <div className="space-y-3">
                {[
                  { key: "device", value: device, note: "read from User-Agent header server-side (no cookie - GDPR safe)" },
                  { key: "logged_in", value: String(attributes.logged_in), note: "from demo_logged_in cookie (Audience Switcher)" },
                ].map(({ key, value, note }) => (
                  <div key={key} className="flex items-start justify-between gap-4 pb-3 border-b border-ghost-border last:border-0">
                    <div>
                      <code className="text-sm font-mono text-on-surface">{key}</code>
                      <p className="text-xs text-on-surface-variant mt-0.5">{note}</p>
                    </div>
                    <code className="text-sm font-mono text-brand shrink-0">{value}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">Adding Custom Attributes</h3>
              <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
                Spread the base visitor attributes from{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
                and add your extras as the third argument to{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getDecision()</code>.
                Then define matching audience conditions in the FX dashboard.
              </p>
              <CodeBlock code={`// Base attributes (device, logged_in, persona) are automatic.
// For extra attributes, spread after getVisitorContext():
const { userId, attributes } = await getVisitorContext();
await getDecision("my_flag", userId, {
  ...attributes,
  plan: "premium",  // from your database
  country: "GB",    // from geo header
});`} />
            </div>
          </div>
        </section>

        <section id="project-vs-cms-flag">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Organizing CMS Flags: cms_flag vs a Separate Project <a href="#project-vs-cms-flag" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The middleware has to know which flags drive CMS content (and should rewrite the URL) versus
            component or client-side experiments that should not. There are two ways to draw that line - this
            demo uses the first, but the second is the cleaner setup at scale.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-on-surface">A marker variable in one project</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">this demo</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Every flag lives in a single FX project. Each CMS experiment sets a{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_flag: true</code> variation variable, and the
                middleware filters <code className="bg-surface-low px-1 rounded font-mono text-xs">decideAll()</code> down to those.
                Quickest to start.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">One project, one datafile, one SDK key</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">The edge downloads and evaluates every flag, CMS or not</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">Easy to forget cms_flag, or set it on the wrong experiment</span></div>
              </div>
            </div>
            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-on-surface">A dedicated FX project</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">recommended</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                CMS-routing experiments live in their own FX project with their own datafile. Project membership
                <em> is</em> the marker - <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_flag</code> disappears and
                the middleware evaluates only CMS flags. <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code>{" "}
                still scopes each experiment to a page.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Smaller, faster edge datafile - only CMS flags</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">A component experiment can never leak into CMS routing</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Independent TTL, ownership, and blast radius</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">Two SDK keys; the client impression must target this project too</span></div>
              </div>
            </div>
          </div>

          <Callout variant="warning">
            <strong>If you split projects, the bucketing event must fire against the same project.</strong>{" "}
            Bucketing happens at the edge in the CMS project, but the impression (step 7) fires in the browser via{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">FxBucketingEvent</code>. Point that client at the CMS
            project&apos;s public SDK key, or the impression lands in the wrong project and the experiment shows no participants.
            Everything else - the <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code> cookie,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> scoping,{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">includeOriginal</code>, and ISR-per-variation - is unchanged.
          </Callout>
        </section>

        <section id="code-middleware">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: Middleware - decide + route-scoped URL rewrite <a href="#code-middleware" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            Runs at the edge on every request. Sets the stable visitor ID, fetches the FX datafile
            (60s edge cache), evaluates all flags, keeps only the ones whose{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_flag</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> target this page, and rewrites the URL
            with variation path segments. The user&apos;s browser always sees the original URL - the rewrite is transparent.
          </p>
          <CodeBlock code={MIDDLEWARE_SNIPPET} label="src/middleware.ts" />
        </section>

        <section id="code-page-route">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: CMS page route - variation filter <a href="#code-page-route" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            The catch-all route reads the variation keys out of the URL, collects them, and passes
            them to Graph. Every CMS page automatically serves the right content variant.
          </p>
          <CodeBlock code={VARIATIONS_SNIPPET} label="src/app/[[...slug]]/page.tsx" />
        </section>

        <section id="code-graph-query">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: Generated Graph query <a href="#code-graph-query" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            What <code className="bg-surface-low px-1 rounded font-mono">getContentByPath</code> sends to Graph under the hood when a
            variation is active - the base and the named variation come back together, and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">includeOriginal: true</code> guarantees a safe fallback.
          </p>
          <CodeBlock code={GRAPH_QUERY_SNIPPET} label="Theoretical GraphQL (personal variation active)" />
        </section>

        <section id="code-bucketing-event">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: Bucketing event (client) <a href="#code-bucketing-event" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            Middleware encoded{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">flagKey--variationKey</code>{" "}
            into the URL, so{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">extractVariations(slug)</code>{" "}
            already knows the <code className="bg-surface-low px-1 rounded font-mono text-xs">flagKey</code> - no extra SDK call. When Graph
            confirms a variation was served, the page mounts{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">{"<FxBucketingEvent />"}</code>, which calls{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">decide(flagKey, [])</code>{" "}
            client-side for that flag only. Its attributes must mirror the middleware context that produced the variation.
          </p>
          <CodeBlock code={BUCKETING_SNIPPET} label="src/components/FxBucketingEvent.tsx" />
        </section>

        {/* ── Approach comparison ── */}
        <section id="approaches">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Choosing an Approach <a href="#approaches" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            There are three ways to integrate Feature Experimentation with a Next.js CMS page route.
            The right choice depends on whether CDN caching matters for your traffic profile.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {/* Approach A */}
            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-brand uppercase tracking-wider">A - This demo</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">ISR</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface">Edge Middleware + URL rewrite</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Middleware evaluates FX and rewrites the URL with{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">__v_flagKey--variationKey</code>.
                The page reads variation from{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">params</code> (no{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">cookies()</code>) so
                ISR works. Each variation URL is a separate CDN cache entry.
                A small client component fires the bucketing event after render.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">~10-50ms TTFB on cached requests</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">CDN serves warm requests - server load scales down</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">Bucketing event fires after page load (CSR)</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">More moving parts (middleware + browser SDK)</span></div>
              </div>
            </div>

            {/* Approach B */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider">B</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">SSR</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface">force-dynamic SSR</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getOptimizelyUser()</code> reads
                cookies in the page render.{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">decideAll()</code> runs server-side,
                variation filter goes to Graph, and the bucketing event fires server-side too.
                Simpler code - no middleware changes or client component needed.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Simplest - everything in one server component</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Bucketing event fires synchronously before HTML</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">~300-1000ms TTFB on every request (no caching)</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">cookies() blocks ISR - force-dynamic is required</span></div>
              </div>
            </div>

            {/* Approach C */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-on-surface-variant uppercase tracking-wider">C - Not recommended</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">CSR</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface">Client-side only</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Page renders base content from the server. After hydration, the browser SDK
                evaluates flags and fetches the variation. Content swaps in after the
                initial render - the user sees a flash of the base content before the
                variation appears.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">No server changes required</span></div>
                <div className="flex gap-2"><span className="text-red-500 font-bold shrink-0">-</span><span className="text-on-surface-variant">Visible flicker - base content shows for ~100-500ms</span></div>
                <div className="flex gap-2"><span className="text-red-500 font-bold shrink-0">-</span><span className="text-on-surface-variant">Variation data in the waterfall - slower effective LCP</span></div>
                <div className="flex gap-2"><span className="text-red-500 font-bold shrink-0">-</span><span className="text-on-surface-variant">CMS content fetched twice (base SSR + variation CSR)</span></div>
              </div>
            </div>
          </div>

        </section>

        <section id="code-user-helper">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: FX user helper - one context per request <a href="#code-user-helper" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            The <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code> cookie has an expiration
            date, so the same visitor always lands in the same bucket - across page loads and return visits. React{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">cache()</code> deduplicates within a single render tree:
            cookies are read once, the SDK context is created once, and concurrent visitors each get their own independent context -
            nothing shared across users. <code className="bg-surface-low px-1 rounded font-mono text-xs">decideAll()</code> evaluates
            every flag for this visitor in one call with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">DISABLE_DECISION_EVENT</code> - no impressions fired yet.
          </p>
          <CodeBlock code={USER_LIB_SNIPPET} label="src/lib/optimizely/user.ts" />
        </section>

        <section id="code-why-wrapper">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: Why a wrapper instead of the SDK directly? <a href="#code-why-wrapper" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <div className="bg-surface-lowest border border-brand/20 rounded-2xl p-6 mt-3">
            <p className="text-sm text-on-surface-variant mb-3 leading-relaxed">
              Optimizely ships two SDKs. <code className="bg-surface-low px-1 rounded font-mono text-xs">@optimizely/react-sdk</code> is a
              separate package that provides an <code className="bg-surface-low px-1 rounded font-mono text-xs">OptimizelyProvider</code> context
              wrapper and a <code className="bg-surface-low px-1 rounded font-mono text-xs">useDecision()</code> hook - designed for client-side
              React apps where a single SDK instance lives in the browser and flags are evaluated in the client. That SDK also has an{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">isServerSide</code> prop on{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">OptimizelyProvider</code> that disables background polling
              and event batching during SSR so the SDK doesn&apos;t try to run browser-only logic - it was removed in react-sdk v4 in favour
              of configuring a static per-request instance directly.
            </p>
            <p className="text-sm text-on-surface-variant mb-4 leading-relaxed">
              This project uses <code className="bg-surface-low px-1 rounded font-mono text-xs">@optimizely/optimizely-sdk</code> directly
              instead. Next.js App Router server components can&apos;t use React context or hooks, so{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">OptimizelyProvider</code> and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">useDecision</code> don&apos;t apply. The wrapper{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">getOptimizelyUser()</code> fills the same role: it resolves the
              stable <code className="bg-surface-low px-1 rounded font-mono text-xs">userId</code> and visitor attributes from cookies and
              headers, creates one user context per request via React{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cache()</code>, and defaults to{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">DISABLE_DECISION_EVENT</code> so routing passes don&apos;t
              pollute the FX results page - you fire the impression with{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">user.decide(flagKey, [])</code> only when the variation is
              actually rendered.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-4 text-xs">
              <div className="bg-surface-low rounded-xl p-4">
                <p className="font-semibold text-on-surface mb-2">Two-layer architecture</p>
                <div className="space-y-1 text-on-surface-variant">
                  <p><code className="font-mono">getOptimizelyClient()</code> - SDK instance built per request from a datafile cached 60s by Next.js fetch. One datafile download per minute regardless of traffic.</p>
                  <p className="mt-2"><code className="font-mono">getOptimizelyUser()</code> - user context, scoped to the current HTTP request via React <code className="font-mono">cache()</code>. Isolated per visitor, never shared.</p>
                </div>
              </div>
              <div className="bg-surface-low rounded-xl p-4">
                <p className="font-semibold text-on-surface mb-2">When to use what</p>
                <div className="space-y-1 text-on-surface-variant">
                  <p><code className="font-mono">user.decide(flagKey)</code> - preferred. Full visitor context already resolved. Supports <code className="font-mono">{"{ bucketingId }"}</code> and <code className="font-mono">{"{ attributes }"}</code> overrides.</p>
                  <p className="mt-2"><code className="font-mono">getDecision(flagKey, userId, attrs)</code> - low-level, for standalone server calls where you pass userId and attributes yourself (always suppresses impressions). The edge middleware uses the SDK&apos;s <code className="font-mono">/universal</code> entry directly instead.</p>
                </div>
              </div>
            </div>
            <CodeBlock code={WRAPPER_VS_SDK_SNIPPET} label="Why the wrapper exists" />
          </div>
        </section>

        <section id="code-single-decision">
          <h2 className="font-display text-lg font-semibold text-on-surface mb-1">
            Code: Single flag decision in a component <a href="#code-single-decision" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-base">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-3">
            For feature-gating or variable-driven UI outside the CMS page route. The same
            impression rule applies - call <code className="bg-surface-low px-1 rounded font-mono text-xs">user.decide(flagKey, [])</code>{" "}
            when the variation is actually rendered to fire the impression.
          </p>
          <CodeBlock code={DECISION_SNIPPET} label="src/components/SubscribeBanner.tsx" />
        </section>

        {/* ── Bucketing ID ── */}
        <section id="bucketing-id">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Bucketing ID Override <a href="#bucketing-id" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            By default the FX SDK buckets users by their <code className="bg-surface-low px-1 rounded font-mono text-xs">userId</code>.
            Setting the reserved <code className="bg-surface-low px-1 rounded font-mono text-xs">$opt_bucketing_id</code> attribute
            overrides <em>which</em> ID drives bucketing - while keeping the original <code className="bg-surface-low px-1 rounded font-mono text-xs">userId</code> for
            analytics. This means all users sharing the same bucketing ID land in the same variation,
            regardless of their individual user IDs.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              {
                title: "B2B / account-level experiments",
                body: "Every seat on the same company account sees the same variation. Avoids the awkward situation where user A sees Variation 1 and user B on the same account sees Variation 2 in the same meeting.",
              },
              {
                title: "Cross-device consistency",
                body: "A logged-in user ID works as the bucketing ID - the same variation follows the user across their phone, tablet, and desktop, regardless of which device generated their anonymous visitor ID.",
              },
              {
                title: "Gradual rollouts to accounts",
                body: "Roll out a new feature to 10% of accounts (not 10% of users). Avoids fragmenting the experience inside the same company during a staged rollout.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
                <h3 className="font-display font-semibold text-on-surface mb-2">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          <CodeBlock code={BUCKETING_ID_SNIPPET} label="src/components/MyPage.tsx" />

          {/* Live comparison */}
          <div className="mt-8">
            <h3 className="font-display font-semibold text-on-surface mb-1">Live comparison - <code className="font-mono font-semibold">hero_copy</code></h3>
            <p className="text-sm text-on-surface-variant mb-5">
              {bucketingId
                ? `Bucketing ID active (SHA-256 of login email). The two decisions below may land in different variations - the normal decision is bucketed by your browser's stable userId, the account decision by the hashed login ID.`
                : "Sign in via the Audience Switcher (bottom-right) to see the account-level decision alongside your normal decision."}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-3">
                  Normal - bucketed by userId
                </p>
                <HeroCopyDemo decision={heroCopyDecision} />
                {heroCopyDecision && (
                  <p className="mt-2 text-xs font-mono text-on-surface-variant">
                    variation: <span className="text-brand">{heroCopyDecision.variationKey ?? "off"}</span>
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-3">
                  Account - bucketed by{" "}
                  <span className={bucketingId ? "text-emerald-600" : "text-on-surface-variant"}>
                    {bucketingId ? `$opt_bucketing_id: "${bucketingId.slice(0, 8)}…"` : "not set"}
                  </span>
                </p>
                {bucketedDecision ? (
                  <>
                    <HeroCopyDemo decision={bucketedDecision} />
                    <p className="mt-2 text-xs font-mono text-on-surface-variant">
                      variation: <span className="text-emerald-600">{bucketedDecision.variationKey ?? "off"}</span>
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-ghost-border bg-surface-lowest p-8 text-center h-full flex items-center justify-center">
                    <p className="text-sm text-on-surface-variant">
                      Sign in via the Audience Switcher to activate
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Your session ── */}
        <section id="all-decisions">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">All Flag Decisions (diagnostics) <a href="#all-decisions" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a></h2>
          <p className="text-sm text-on-surface-variant mb-5 max-w-3xl">
            A stable <code className="bg-surface-low px-1 rounded text-xs font-mono">optimizelyEndUserId</code> cookie
            is set by Next.js middleware on first visit, and every flag is evaluated for it via{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">userContext.decideAll()</code> - reload and you always
            land in the same variation. Changes in the FX dashboard take effect within 60 seconds (datafile cache TTL). Each
            decision carries a <code className="bg-surface-low px-1 rounded text-xs font-mono">variables</code> map of typed values
            (strings, booleans, numbers, JSON) that drive copy or configuration per variation without code changes.
          </p>
          {Object.keys(decisions).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ghost-border bg-surface-lowest p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                No flags found - check that{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_FX_SDK_KEY</code>{" "}
                is set in <code className="bg-surface-low px-1 rounded font-mono text-xs">.env.local</code>.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(decisions).map((d) => (
                <FlagCard key={d.flagKey} decision={d} />
              ))}
            </div>
          )}
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">The variation key is the only contract</strong> between FX and the CMS. The string must match exactly (case-sensitive) between the FX variation key and the CMS variation name.</>,
          <><strong className="text-on-surface">includeOriginal: true</strong> means users outside the experiment always get the original content. Safe to add the filter before any CMS variations exist.</>,
          <><strong className="text-on-surface">Datafile is cached for 60 seconds</strong> via Next.js fetch revalidation. Changes in the FX dashboard propagate within one minute with no server restart.</>,
          <><strong className="text-on-surface">React cache() is scoped to a single HTTP request.</strong> Any number of server components can call <code className="bg-surface-low px-1 rounded font-mono text-xs">getOptimizelyUser()</code> - they all share one user context for that request. Concurrent visitors each get their own completely isolated context; nothing is shared across users.</>,
          <><strong className="text-on-surface">DISABLE_DECISION_EVENT</strong> suppresses bucketing events during the middleware routing pass. Once the variation is rendered, <code className="bg-surface-low px-1 rounded font-mono text-xs">{"<FxBucketingEvent flagKey={...} />"}</code> mounts client-side and fires the impression for that flag only - its attributes must mirror the middleware context, or the impression can bucket differently than what was served.</>,
          <><strong className="text-on-surface">cms_route scopes an experiment to a page.</strong> The middleware only applies a variation whose <code className="bg-surface-low px-1 rounded font-mono text-xs">cms_route</code> matches the current path, so many CMS experiments can run across the site without colliding or fragmenting each other&apos;s ISR cache. There is no server-side re-decide - <code className="bg-surface-low px-1 rounded font-mono text-xs">page._metadata.variation</code> confirms what Graph served.</>,
          <><strong className="text-on-surface">Variations work on any content type</strong> - pages, shared blocks, navigation. Wherever Graph accepts a variation filter, the SDK wires in seamlessly.</>,
          <><strong className="text-on-surface">CMS variations must be created in Visual Builder, but can then be updated via the Management API.</strong> The REST API silently ignores the <code className="bg-surface-low px-1 rounded font-mono text-xs">variation</code> field on <code className="bg-surface-low px-1 rounded font-mono text-xs">POST</code> - you cannot create a named variation programmatically. But creating one in the UI generates a new draft <strong>version</strong> that you can PATCH and publish.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            {
              label: "user.ts",
              path: "src/lib/optimizely/user.ts",
              content: userTs,
            },
          ]}
        />

      </div>
    </>
  );
}
