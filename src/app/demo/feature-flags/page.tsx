export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAllDecisions, type FxDecision } from "@/lib/optimizely/experimentation";

export const metadata: Metadata = {
  title: "Feature Experimentation Demo",
};

const SDK_SNIPPET = `import { cookies } from "next/headers";
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
  return <p>{decision.variables.subscribe_title as string}</p>;
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
        isContribute
          ? "bg-gradient-brand"
          : "bg-surface-lowest border border-ghost-border"
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
          isContribute
            ? "bg-surface text-brand"
            : "bg-brand text-on-brand"
        }`}
      >
        {isContribute ? "Get involved" : "Subscribe"}
      </button>
    </div>
  );
}

export default async function FeatureFlagsDemoPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";
  const attributes = { device, logged_in: false };

  const decisions = await getAllDecisions(userId, attributes);
  const subscribeDecision = decisions["subscribe_button"];

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            Feature Experimentation
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Optimizely Feature Experimentation runs alongside the CMS on the same
            platform. Flag decisions are evaluated server-side in React Server Components —
            no client JS, no layout shift. Each visitor gets a stable bucket derived from
            a first-party cookie, and audiences like <em>Desktop</em> and{" "}
            <em>Mobile</em> are resolved from the User-Agent at the edge.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              ✓ Server-side decisions
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Feature flags · Experiments
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Audience targeting
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Variable delivery
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* User context */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Your Session
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            A stable <code className="bg-surface-low px-1 rounded text-xs font-mono">fx_user_id</code> cookie
            is set by Next.js middleware on first visit. Flag decisions below are bucketed to this ID —
            reload the page and you always get the same variation.
          </p>
          <div className="inline-flex flex-wrap gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">User ID</span>
              <span className="text-sm font-mono text-on-surface">{userId.slice(0, 8)}…{userId.slice(-4)}</span>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">Device</span>
              <span className="text-sm font-mono text-on-surface">{device}</span>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-xl px-5 py-3 flex flex-col gap-0.5">
              <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">logged_in</span>
              <span className="text-sm font-mono text-on-surface">false</span>
            </div>
          </div>
        </section>

        {/* Flag decisions grid */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Flag Decisions
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            All flags evaluated for your session via{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">userContext.decideAll()</code>.
            Enable or disable flags in the FX dashboard and reload — decisions update within 60 seconds
            (datafile cache TTL).
          </p>
          {Object.keys(decisions).length === 0 ? (
            <p className="text-on-surface-variant text-sm">
              No flags found — check that <code className="bg-surface-low px-1 rounded font-mono text-xs">OPTIMIZELY_FX_SDK_KEY</code> is set.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(decisions).map((d) => (
                <FlagCard key={d.flagKey} decision={d} />
              ))}
            </div>
          )}
        </section>

        {/* Subscribe live demo */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live: <code className="font-mono text-2xl">subscribe_button</code> Flag
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">
            The component below is driven entirely by the{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">subscribe_button</code> flag and its{" "}
            <code className="bg-surface-low px-1 rounded text-xs font-mono">subscribe_title</code> variable.
            Variations: <strong>off</strong>, <strong>on</strong> (default title), <strong>contribute</strong> (alternate messaging).
          </p>
          <SubscribeDemo decision={subscribeDecision} />
        </section>

        {/* Code snippet */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            Server-Side Decision
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Flag decisions happen in React Server Components — the FX SDK runs on the
            server, reads the cached datafile, and buckets the user before the page is
            streamed to the browser. Zero client-side SDK weight.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{SDK_SNIPPET}</code>
          </pre>
        </section>

      </div>
    </div>
  );
}
