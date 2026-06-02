export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAllDecisions, type FxDecision } from "@/lib/optimizely/experimentation";

export const metadata: Metadata = {
  title: "Feature Experimentation Demo",
};

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const DECISION_SNIPPET = `import { cookies } from "next/headers";
import { getDecision } from "@/lib/optimizely/experimentation";

// Server component — no client JS needed
export default async function MyPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";

  const decision = await getDecision("subscribe_button", userId, {
    device,
    logged_in: false,
  });

  if (!decision.enabled) return null;

  // Variables come back typed — you cast to the type you expect
  const title = decision.variables.subscribe_title as string;
  return <Banner title={title} variation={decision.variationKey} />;
}`;

const VARIATIONS_SNIPPET = `// src/app/[[...slug]]/page.tsx
import { getAllDecisions } from "@/lib/optimizely/experimentation";
import { getClient } from "@optimizely/cms-sdk";

async function CmsPage({ params }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";

  // Step 1 — evaluate all FX flags
  const decisions = await getAllDecisions(userId, { device, logged_in: false });

  // Step 2 — collect active variation keys (skip "off")
  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  // Step 3 — pass them to Graph as a variation filter
  //   includeOriginal: true → users NOT in an experiment still see original content
  const variationOption = activeVariations.length > 0
    ? {
        variation: {
          include: "SOME" as const,
          value: activeVariations,   // e.g. ["banner1", "contribute"]
          includeOriginal: true,
        },
      }
    : undefined;

  // Step 4 — Graph returns the CMS variant whose key matches, or falls back
  const client = getClient();
  const [page] = await client.getContentByPath(\`/en/\${slug}/\`, variationOption);
  return <OptimizelyComponent content={page} />;
}`;

const MIDDLEWARE_SNIPPET = `// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Stable per-user ID — set once, persists across page loads
  if (!req.cookies.get("fx_user_id")) {
    res.cookies.set("fx_user_id", uuidv4(), {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // Device detection — used as an FX audience attribute
  const ua = req.headers.get("user-agent") ?? "";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  res.cookies.set("fx_device", isMobile ? "mobile" : "desktop", {
    httpOnly: true,
    sameSite: "lax",
  });

  return res;
}`;

const EXPERIMENTATION_LIB_SNIPPET = `// src/lib/optimizely/experimentation.ts
import { cache } from "react";
import {
  createInstance,
  createStaticProjectConfigManager,
  createForwardingEventProcessor,
  createLogger,
  eventDispatcher,
  OptimizelyDecideOption,
  ERROR,
} from "@optimizely/optimizely-sdk";

const DATAFILE_URL =
  \`https://cdn.optimizely.com/datafiles/\${process.env.OPTIMIZELY_FX_SDK_KEY}.json\`;

// React cache() memoises per request — all server components share one instance
const buildClient = cache(async function buildClient() {
  const res = await fetch(DATAFILE_URL, { next: { revalidate: 60 } });
  const datafile = await res.text();
  const configManager = createStaticProjectConfigManager({ datafile });
  const logger = createLogger({ level: ERROR });
  const eventProcessor = createForwardingEventProcessor(eventDispatcher);
  return createInstance({ projectConfigManager: configManager, logger, eventProcessor });
});

export async function getAllDecisions(userId, attributes) {
  const client = await buildClient();
  const ctx = client.createUserContext(userId, attributes);
  const raw = ctx.decideAll([OptimizelyDecideOption.DISABLE_DECISION_EVENT]);
  // Normalise to a plain object
  return Object.fromEntries(
    Object.entries(raw).map(([key, d]) => [
      key,
      { flagKey: key, enabled: d.enabled, variationKey: d.variationKey,
        variables: d.variables, reasons: d.reasons },
    ])
  );
}`;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

function SubscribeDemo({ decision }: { decision: FxDecision | undefined }) {
  if (!decision?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-ghost-border bg-surface-lowest p-8 text-center">
        <p className="text-sm font-mono text-on-surface-variant mb-1">subscribe_button</p>
        <p className="text-on-surface-variant text-sm">
          Flag is <strong>off</strong> — enable it in the FX dashboard to see the live subscribe CTA.
        </p>
      </div>
    );
  }

  const title =
    (decision.variables.subscribe_title as string) ||
    (decision.variationKey === "contribute" ? "Contribute to the community" : "Subscribe for updates");
  const isContribute = decision.variationKey === "contribute";

  return (
    <div
      className={`rounded-2xl p-8 text-center ${
        isContribute ? "bg-gradient-brand" : "bg-surface-lowest border border-ghost-border"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-widest mb-3 ${
          isContribute ? "text-on-brand opacity-70" : "text-on-surface-variant"
        }`}
      >
        variation: {decision.variationKey}
      </p>
      <h3
        className={`font-display text-2xl font-bold mb-4 ${
          isContribute ? "text-on-brand" : "text-on-surface"
        }`}
      >
        {title}
      </h3>
      <button
        className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 ${
          isContribute ? "bg-surface text-brand" : "bg-brand text-on-brand"
        }`}
      >
        {isContribute ? "Get involved" : "Subscribe"}
      </button>
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

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-ghost-border">
      {label && (
        <div className="bg-surface-low border-b border-ghost-border px-4 py-2">
          <span className="text-xs font-mono text-on-surface-variant">{label}</span>
        </div>
      )}
      <pre className="bg-surface-lowest p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
        <code>{code}</code>
      </pre>
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

function Arrow() {
  return (
    <div className="flex items-center justify-center text-on-surface-variant text-lg select-none">→</div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FeatureFlagsDemoPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";
  const attributes = { device, logged_in: false };

  const decisions = await getAllDecisions(userId, attributes);
  const subscribeDecision = decisions["subscribe_button"];

  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  return (
    <div className="min-h-screen bg-surface">

      {/* ── Hero ── */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Feature Experimentation
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Optimizely Feature Experimentation runs alongside SaaS CMS on the same platform.
            Flag decisions are evaluated server-side in React Server Components — no client JS,
            no layout shift. Variation keys from FX drive which CMS content variant Graph returns,
            connecting A/B experiments directly to editor-created content variations.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {["✓ Server-side decisions", "Feature flags · Experiments", "Audience targeting", "Variable delivery", "CMS Variations integration"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        {/* ── Architecture overview ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How It All Fits Together
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Three layers work together on every page request. The browser never touches the SDK
            or runs an experiment script — all decisions happen at the edge before HTML is streamed.
          </p>

          {/* Architecture flow */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🌐</div>
              <p className="text-xs font-mono font-semibold text-on-surface mb-1">Browser</p>
              <p className="text-xs text-on-surface-variant">Sends <code className="bg-surface-low px-1 rounded">fx_user_id</code> cookie</p>
            </div>
            <Arrow />
            <div className="bg-surface-lowest border border-brand/30 rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <p className="text-xs font-mono font-semibold text-on-surface mb-1">FX SDK (server)</p>
              <p className="text-xs text-on-surface-variant">
                Reads datafile · buckets user · returns <code className="bg-surface-low px-1 rounded">variationKey</code> + variables
              </p>
            </div>
            <Arrow />
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 text-center">
              <div className="text-2xl mb-2">🗄️</div>
              <p className="text-xs font-mono font-semibold text-on-surface mb-1">Graph API</p>
              <p className="text-xs text-on-surface-variant">
                Filters by <code className="bg-surface-low px-1 rounded">variation.value</code> · serves matched CMS variant
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">1</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Middleware sets stable IDs</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                On first visit, Next.js middleware writes a <code className="bg-surface-low px-1 rounded font-mono text-xs">fx_user_id</code> UUID
                cookie (1 year TTL) and a <code className="bg-surface-low px-1 rounded font-mono text-xs">fx_device</code> cookie derived from
                the User-Agent. These persist across page loads so bucketing stays stable.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">2</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">FX SDK evaluates flags server-side</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                In a React Server Component, <code className="bg-surface-low px-1 rounded font-mono text-xs">getAllDecisions(userId, attributes)</code> calls
                the locally-cached FX SDK. The datafile is refreshed every 60 seconds via Next.js fetch
                revalidation — no round trip per request.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">3</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Graph returns the right CMS variant</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Active variation keys are passed to <code className="bg-surface-low px-1 rounded font-mono text-xs">getContentByPath</code> as
                a <code className="bg-surface-low px-1 rounded font-mono text-xs">{"{ include: 'SOME', value: [...keys] }"}</code> filter.
                Graph serves the CMS content variant whose key matches — or the original if none exists.
              </p>
            </div>
          </div>
        </section>

        {/* ── Your session ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">Your Session</h2>
          <p className="text-sm text-on-surface-variant mb-6">
            A stable <code className="bg-surface-low px-1 rounded text-xs font-mono">fx_user_id</code> cookie
            is set by Next.js middleware on first visit. Flag decisions below are bucketed to this ID —
            reload and you always land in the same variation.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">User ID</span>
              <span className="text-sm font-mono text-on-surface">{userId.slice(0, 8)}…{userId.slice(-4)}</span>
              <span className="text-xs text-on-surface-variant">stable per browser</span>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Device</span>
              <span className="text-sm font-mono text-on-surface">{device}</span>
              <span className="text-xs text-on-surface-variant">from User-Agent in middleware</span>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-4 flex flex-col gap-1">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Active Variations</span>
              <span className="text-sm font-mono text-on-surface">
                {activeVariations.length === 0 ? "none" : activeVariations.join(", ")}
              </span>
              <span className="text-xs text-on-surface-variant">keys passed to Graph</span>
            </div>
          </div>

          {/* Flag decisions grid */}
          <h3 className="font-display text-lg font-semibold text-on-surface mb-4">All Flag Decisions</h3>
          <p className="text-sm text-on-surface-variant mb-5">
            Evaluated via <code className="bg-surface-low px-1 rounded text-xs font-mono">userContext.decideAll()</code>.
            Changes in the FX dashboard take effect within 60 seconds (datafile cache TTL).
          </p>
          {Object.keys(decisions).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ghost-border bg-surface-lowest p-8 text-center">
              <p className="text-on-surface-variant text-sm">
                No flags found — check that{" "}
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

        {/* ── Live subscribe demo ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live Demo: <code className="font-mono text-2xl">subscribe_button</code>
          </h2>
          <p className="text-sm text-on-surface-variant mb-2">
            This component is driven entirely by the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">subscribe_button</code> flag
            and its <code className="bg-surface-low px-1 rounded text-xs font-mono">subscribe_title</code> variable.
          </p>
          <div className="flex flex-wrap gap-2 mb-6 text-xs text-on-surface-variant">
            <span>Variations:</span>
            <Pill>off</Pill>
            <span>·</span>
            <Pill>on</Pill>
            <span>(default title from variable)</span>
            <span>·</span>
            <Pill>contribute</Pill>
            <span>(alternate messaging + brand gradient)</span>
          </div>
          <SubscribeDemo decision={subscribeDecision} />
        </section>

        {/* ── CMS Variations — the connection ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            CMS Variations — Connecting FX to Content
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            FX variation keys and CMS content variations share a single string contract.
            When Graph receives an active variation key, it looks for a CMS content variant
            with the same name and returns it. Editors create the variant in Visual Builder;
            the SDK wires it at request time — no code change required after initial setup.
          </p>

          {/* Flow diagram */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              Request flow — this demo&apos;s homepage_audience experiment
            </p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 mb-1 min-w-[120px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">FX Dashboard</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">flag: <code className="font-mono">homepage_audience</code></p>
                  <p className="text-xs text-on-surface-variant">variation: <code className="font-mono text-brand">business</code></p>
                </div>
              </div>
              <div className="flex items-center pt-4 text-on-surface-variant">→</div>
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 mb-1 min-w-[140px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">FX SDK</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">user bucketed into</p>
                  <p className="text-xs text-on-surface-variant">variationKey: <code className="font-mono text-brand">business</code></p>
                </div>
              </div>
              <div className="flex items-center pt-4 text-on-surface-variant">→</div>
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 mb-1 min-w-[180px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">Graph query</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 font-mono">variation: {"{"}</p>
                  <p className="text-xs text-on-surface-variant font-mono pl-2">include: &apos;SOME&apos;,</p>
                  <p className="text-xs text-on-surface-variant font-mono pl-2">value: [<span className="text-brand">&apos;business&apos;</span>]</p>
                  <p className="text-xs text-on-surface-variant font-mono">{"}"}</p>
                </div>
              </div>
              <div className="flex items-center pt-4 text-on-surface-variant">→</div>
              <div className="text-center">
                <div className="bg-brand/10 border border-brand/30 rounded-xl px-4 py-3 mb-1 min-w-[160px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">CMS serves</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">content variant</p>
                  <p className="text-xs font-mono text-brand">named &quot;business&quot;</p>
                  <p className="text-xs text-on-surface-variant text-[10px] mt-1">(or original if no match)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>CMS variations must be created in Visual Builder — the Management API cannot create them.</strong>{" "}
              The <code className="bg-amber-100 px-1 rounded font-mono text-xs">variation</code> field
              exists in Graph&apos;s schema but is silently ignored by the Management API on write.
              However, once created in Visual Builder each variation becomes a new draft{" "}
              <strong>version</strong> — you can discover the version number via{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">GET /content/{"{key}"}/versions</code>{" "}
              and PATCH it with the correct composition + <code className="bg-amber-100 px-1 rounded font-mono text-xs">status: &quot;published&quot;</code>.
              See <code className="bg-amber-100 px-1 rounded font-mono text-xs">scripts/update-homepage-variations.ts</code>.
            </p>
          </div>

          {/* Current session's variation keys → Graph */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <h3 className="font-display font-semibold text-on-surface mb-1">
              Your Variation Keys → Graph Filter
            </h3>
            <p className="text-xs text-on-surface-variant mb-4">
              This is what the live page route is passing to{" "}
              <code className="bg-surface-low px-1 rounded font-mono">getContentByPath</code> for your session right now.
            </p>
            <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
              <code>
                {activeVariations.length === 0
                  ? `// No active variation keys — all flags are off or returning "off"\n// Graph will return original content on all pages\nvariationOption = undefined`
                  : `variationOption = {\n  variation: {\n    include: "SOME",\n    value: ${JSON.stringify(activeVariations)},\n    includeOriginal: true,\n  },\n}`}
              </code>
            </pre>
            {activeVariations.length === 0 && (
              <p className="text-xs text-on-surface-variant mt-3">
                Enable a flag and run an experiment in the FX dashboard, then reload — your variation key will appear above and start influencing CMS content delivery.
              </p>
            )}
          </div>
        </section>

        {/* ── Setup guide ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Setting Up CMS Variations — Step by Step
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Once the integration code is in place (see below), editors can set up any number of
            content experiments without touching code. The variation key string is the only contract
            between Feature Experimentation and the CMS.
          </p>

          <div className="space-y-8 max-w-2xl">
            <Step number={1} title="Create a flag and experiment in Feature Experimentation">
              Run <code className="bg-surface-low px-1 rounded font-mono text-xs">npx tsx scripts/seed-fx-experiment.ts</code>{" "}
              (requires <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_FX_API_TOKEN</code> and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_FX_PROJECT_ID</code> in{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">.env.local</code>) — or create manually
              in the FX dashboard. This demo uses flag{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">homepage_audience</code> with variations{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> (22%),{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code> (22%),{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">new_visitor</code> (22%), and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">off</code> (34%).
            </Step>

            <Step number={2} title="Create variations in Visual Builder, then update via script">
              Open the homepage in the CMS Visual Builder. In the right-hand panel, click{" "}
              <strong>Add variation</strong>. Create three variations named exactly{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code>,{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>, and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">new_visitor</code>{" "}
              (case-sensitive). Each becomes a new draft version in the CMS. Then run{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">npx tsx scripts/update-homepage-variations.ts</code>{" "}
              to PATCH those versions with the correct compositions and publish them — no manual composition
              editing in the UI needed.
            </Step>

            <Step number={3} title="Validate with the Audience Switcher">
              Use the floating pill in the bottom-right corner to preview each variation instantly —
              no waiting for FX bucketing. Select <strong>Business Customer</strong>; the homepage should
              show &ldquo;Banking built for business&rdquo; once the CMS variation exists.
            </Step>

            <Step number={4} title="Enable the flag and start the experiment">
              Turn on the flag and launch the experiment in the FX dashboard. FX handles traffic
              allocation and bucketing; Graph handles content delivery. Analytics, winner declaration,
              and rollout happen entirely in the FX dashboard — no code changes needed.
            </Step>

            <Step number={5} title="Validate with this page">
              Reload this page — your current variation key will appear in the{" "}
              <strong>Flag Decisions</strong> grid above and in the <strong>Your Variation Keys → Graph Filter</strong>{" "}
              block. If the key matches a CMS variation, that page now serves the personalised variant.
            </Step>
          </div>
        </section>

        {/* ── Audience targeting ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Audience Targeting
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            FX attributes (like <code className="bg-surface-low px-1 rounded font-mono text-xs">device</code>) are matched
            against audiences defined in the FX dashboard. Targeting happens on the server — the
            browser never knows which audience it was matched to.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">Built-in Attributes</h3>
              <div className="space-y-3">
                {[
                  { key: "device", value: device, note: "derived from User-Agent in middleware" },
                  { key: "logged_in", value: "false", note: "hardcoded — replace with your auth check" },
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
                Pass any key-value pairs as the second argument to{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getAllDecisions</code>.
                Then define matching audience conditions in the FX dashboard.
              </p>
              <pre className="bg-surface-low rounded-xl p-3 text-xs font-mono text-on-surface-variant leading-relaxed">
                <code>{`getAllDecisions(userId, {
  device,           // "mobile" | "desktop"
  logged_in: true,  // from auth session
  plan: "premium",  // from your database
  country: "GB",    // from geo header
})`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── Variables ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Feature Variables
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Each variation in a flag can carry typed variables — strings, booleans, numbers, or JSON.
            Variables let editors control copy, configuration, and styling without code changes.
            The <code className="bg-surface-low px-1 rounded font-mono text-xs">subscribe_button</code> flag
            uses a <code className="bg-surface-low px-1 rounded font-mono text-xs">subscribe_title</code> string
            variable to drive the CTA text.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">What&apos;s available now</h3>
              {Object.keys(decisions).length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">No flags found.</p>
              ) : (
                <div className="space-y-4">
                  {Object.values(decisions).map((d) => {
                    const hasVars = Object.keys(d.variables).length > 0;
                    return (
                      <div key={d.flagKey} className="pb-4 border-b border-ghost-border last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-xs font-mono font-semibold text-on-surface">{d.flagKey}</code>
                          {d.variationKey && <Pill>{d.variationKey}</Pill>}
                        </div>
                        {hasVars ? (
                          <pre className="bg-surface-low rounded-lg p-2 text-xs font-mono text-on-surface-variant">
                            <code>{JSON.stringify(d.variables, null, 2)}</code>
                          </pre>
                        ) : (
                          <p className="text-xs text-on-surface-variant italic">no variables defined</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">Reading variables in code</h3>
              <pre className="bg-surface-low rounded-xl p-3 text-xs font-mono text-on-surface-variant leading-relaxed">
                <code>{`const decision = await getDecision(
  "subscribe_button",
  userId,
  { device, logged_in: false },
);

// Variables are Record<string, unknown>
// Cast to the type you expect
const title =
  decision.variables.subscribe_title as string;

const config =
  decision.variables.hero_config as {
    headline: string;
    cta: string;
    theme: "light" | "dark";
  };`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* ── Code snippets ── */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-6">
            Integration Code
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-display font-semibold text-on-surface mb-1">
                1. Middleware — stable user ID + device detection
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                Sets first-party cookies on every request. Runs at the edge before any page logic.
              </p>
              <CodeBlock code={MIDDLEWARE_SNIPPET} label="src/middleware.ts" />
            </div>

            <div>
              <h3 className="font-display font-semibold text-on-surface mb-1">
                2. FX SDK wrapper — datafile + decisions
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                React&apos;s <code className="bg-surface-low px-1 rounded font-mono text-xs">cache()</code> ensures
                one SDK instance per request regardless of how many components call it.
                The datafile is fetched once and revalidated every 60 seconds.
              </p>
              <CodeBlock code={EXPERIMENTATION_LIB_SNIPPET} label="src/lib/optimizely/experimentation.ts" />
            </div>

            <div>
              <h3 className="font-display font-semibold text-on-surface mb-1">
                3. CMS page route — flags → Graph variation filter
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                The catch-all route evaluates all flags, collects active variation keys, and passes
                them to Graph. Every CMS page automatically serves the right content variant.
              </p>
              <CodeBlock code={VARIATIONS_SNIPPET} label="src/app/[[...slug]]/page.tsx" />
            </div>

            <div>
              <h3 className="font-display font-semibold text-on-surface mb-1">
                4. Using a single flag decision in a component
              </h3>
              <p className="text-sm text-on-surface-variant mb-3">
                For feature-gating or variable-driven UI outside the CMS page route.
              </p>
              <CodeBlock code={DECISION_SNIPPET} label="src/components/SubscribeBanner.tsx" />
            </div>
          </div>
        </section>

        {/* ── Key points ── */}
        <section className="bg-surface-lowest border border-ghost-border rounded-2xl p-8">
          <h2 className="font-display text-lg font-bold text-on-surface mb-4">
            Key Things to Know
          </h2>
          <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">The variation key is the only contract</strong> between FX and the CMS.
                The string must match exactly (case-sensitive) between the FX variation key and the CMS variation name.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">includeOriginal: true</strong> means users outside
                the experiment always get the original content. Safe to add the filter before any CMS
                variations exist.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">Datafile is cached for 60 seconds</strong> via
                Next.js fetch revalidation. Changes in the FX dashboard propagate within one minute
                with no server restart.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">React cache() gives one SDK instance per request.</strong>{" "}
                Any number of server components can call <code className="bg-surface-low px-1 rounded font-mono text-xs">getDecision</code>{" "}
                or <code className="bg-surface-low px-1 rounded font-mono text-xs">getAllDecisions</code> with no extra work.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">DISABLE_DECISION_EVENT</strong> suppresses
                impression events during the routing pass. Use{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">bucketVisitor()</code>{" "}
                to fire the impression only when the variant is actually rendered.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">Variations work on any content type</strong> — pages,
                shared blocks, navigation. Wherever Graph accepts a variation filter, the SDK wires in
                seamlessly.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-brand font-bold shrink-0">→</span>
              <span>
                <strong className="text-on-surface">CMS variations must be created in Visual Builder, but can then be updated via the Management API.</strong>{" "}
                The REST API silently ignores the <code className="bg-surface-low px-1 rounded font-mono text-xs">variation</code> field
                on <code className="bg-surface-low px-1 rounded font-mono text-xs">POST</code> — you cannot create a named variation programmatically.
                But creating one in the UI generates a new draft <strong>version</strong>; you can then
                <code className="bg-surface-low px-1 rounded font-mono text-xs mx-1">PATCH /content/{"{key}"}/versions/{"{version}"}</code>
                to set its composition and publish it programmatically.
              </span>
            </li>
          </ul>
        </section>

      </div>
    </div>
  );
}
