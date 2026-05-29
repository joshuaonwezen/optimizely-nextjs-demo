export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAllDecisions, type FxDecision } from "@/lib/optimizely/experimentation";

export const metadata: Metadata = {
  title: "CMS Personalization Demo",
};

const INTEGRATION_SNIPPET = `// src/app/[[...slug]]/page.tsx
import { cookies } from "next/headers";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { getAllDecisions } from "@/lib/optimizely/experimentation";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

initComponentRegistry(); // also calls config() so getClient() works

async function CmsPage({ params }) {
  const { slug } = await params;

  // 1. Get stable user ID from middleware cookie
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";

  // 2. Evaluate ALL FX flags for this user
  const decisions = await getAllDecisions(userId, { device, logged_in: false });

  // 3. Collect active variation keys
  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  // 4. Pass them to Graph — it serves the matching CMS variation if one exists.
  //    includeOriginal:true ensures pages with no matching variation still render.
  const variationOption = activeVariations.length > 0
    ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
    : undefined;

  const client = getClient();
  const [page] = await client.getContentByPath(\`/en/\${slug?.join("/") ?? ""}/\`, variationOption);

  return <OptimizelyComponent content={page} />;
}

export default withAppContext(CmsPage);`;

function ActiveVariationBadge({ variation }: { variation: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-brand/10 text-brand border border-brand/20">
      {variation}
    </span>
  );
}

function FlagRow({ decision }: { decision: FxDecision }) {
  const isActive =
    decision.enabled && decision.variationKey && decision.variationKey !== "off";

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-ghost-border last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <code className="font-mono text-sm text-on-surface truncate">
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
      {isActive ? (
        <ActiveVariationBadge variation={decision.variationKey!} />
      ) : (
        <span className="text-xs font-mono text-on-surface-variant">—</span>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-on-brand text-sm font-bold font-display">
        {number}
      </div>
      <div className="pt-1">
        <h3 className="font-display font-semibold text-on-surface mb-1">{title}</h3>
        <div className="text-sm text-on-surface-variant leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export default async function PersonalizationDemoPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";
  const device = cookieStore.get("fx_device")?.value ?? "desktop";
  const attributes = { device, logged_in: false };

  const decisions = await getAllDecisions(userId, attributes);

  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <section className="bg-gradient-brand py-20">
        <div className="max-w-7xl mx-auto px-8">
          <p className="font-body text-xs font-semibold uppercase tracking-widest mb-4 text-on-brand opacity-70">
            Developer Demo
          </p>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold text-on-brand mb-4">
            CMS Personalization
          </h1>
          <p className="text-lg text-on-brand-muted max-w-2xl leading-relaxed">
            Feature Experimentation and SaaS CMS are the same platform — experiments
            decide which variation key a user gets, and the CMS Graph API serves
            the matching content variation. Editors create variants in Visual Builder;
            the SDK wires them together at request time.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              ✓ Zero client JS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              FX variation keys → Graph variation filter
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Automatic fallback to original
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* How it works — diagram */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How It Works
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Three moving parts, all server-side. The browser never touches the FX SDK
            or runs an A/B experiment script.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">1</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">
                FX decides the bucket
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                On every request, the FX SDK evaluates all flags for this user. When a
                flag is enabled and the user is in an experiment, it returns a
                <code className="bg-surface-low px-1 rounded font-mono text-xs mx-0.5">variationKey</code>
                like <code className="bg-surface-low px-1 rounded font-mono text-xs">banner1</code>.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">2</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">
                Graph filters by variation
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Active variation keys are passed to{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getContentByPath</code>{" "}
                as a{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">{"{ include: 'SOME', value: [...] }"}</code>{" "}
                filter. Graph returns the CMS variation if one exists — or the original
                content if not.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">3</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">
                Editors set it up in Visual Builder
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Editors create a content variation keyed to the FX variation name
                (e.g. <code className="bg-surface-low px-1 rounded font-mono text-xs">banner1</code>).
                No code change required — the key is the contract between FX and CMS.
              </p>
            </div>
          </div>
        </section>

        {/* Your session */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Your Session
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The table below shows every FX flag evaluated for your stable user ID.
            Flags with an active variation key are the ones that influence which CMS
            content variant is served on other pages.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* User context */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-4">
                Attributes
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                    User ID
                  </span>
                  <code className="text-sm font-mono text-on-surface">
                    {userId.slice(0, 8)}…{userId.slice(-4)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                    device
                  </span>
                  <code className="text-sm font-mono text-on-surface">{device}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                    logged_in
                  </span>
                  <code className="text-sm font-mono text-on-surface">false</code>
                </div>
              </div>
            </div>

            {/* Variation keys passed to Graph */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-1">
                Active Variation Keys
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">
                These keys are passed to Graph as the{" "}
                <code className="bg-surface-low px-1 rounded font-mono">variation.value</code>{" "}
                filter on every CMS page request.
              </p>
              {activeVariations.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic">
                  No active variations — all flags are off or returning{" "}
                  <code className="bg-surface-low px-1 rounded font-mono text-xs">off</code>.
                  Enable a flag and assign it to an experiment in the FX dashboard.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeVariations.map((v) => (
                    <ActiveVariationBadge key={v} variation={v} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Flag table */}
          <div className="mt-6 bg-surface-lowest border border-ghost-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-on-surface">
                Flag Decisions
              </h3>
              <span className="text-xs font-mono text-on-surface-variant">
                variation key →
              </span>
            </div>
            {Object.keys(decisions).length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No flags found — check that{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">
                  OPTIMIZELY_FX_SDK_KEY
                </code>{" "}
                is set.
              </p>
            ) : (
              <div>
                {Object.values(decisions).map((d) => (
                  <FlagRow key={d.flagKey} decision={d} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Editor setup guide */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Setting It Up (Editor Guide)
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            No engineering required once the FX SDK is wired in. Editors control which
            content variant each experiment variation sees entirely from Visual Builder
            and the FX dashboard.
          </p>

          <div className="space-y-6 max-w-2xl">
            <Step number={1} title="Create an experiment in Feature Experimentation">
              In the FX dashboard, create a flag (e.g.{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner</code>
              ) and add an experiment with named variations — e.g.{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner1</code>{" "}
              and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner2</code>.
              Note the exact variation key strings — they become the contract with CMS.
            </Step>

            <Step number={2} title="Open the page or shared block in Visual Builder">
              Navigate to the page or block you want to personalize. Click the
              <strong> Variations</strong> panel on the right-hand side. Click{" "}
              <strong>Add variation</strong>.
            </Step>

            <Step number={3} title="Name the variation to match the FX variation key">
              Enter the exact variation key from Step 1 as the variation name — e.g.{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner1</code>.
              This string is the link between FX and CMS. Edit the content for this
              variation and publish it.
            </Step>

            <Step number={4} title="Repeat for each variation">
              Create a second variation named{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner2</code>{" "}
              with different content. Users bucketed into{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner1</code>{" "}
              by FX see the first variant; users in{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">banner2</code>{" "}
              see the second. Users not in the experiment see the original content — no
              extra work needed.
            </Step>

            <Step number={5} title="Launch the experiment">
              Start the experiment in the FX dashboard. FX handles bucketing and traffic
              allocation; the CMS Graph API handles content delivery. Analytics and
              winner declaration happen in FX.
            </Step>
          </div>
        </section>

        {/* Code snippet */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-1">
            The Integration Code
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            This is the only code change required to connect FX and CMS Variations.
            It lives in the catch-all CMS page route — all pages automatically get
            the right content variant based on FX bucketing.
          </p>
          <pre className="bg-surface-low rounded-2xl p-6 text-xs font-mono text-on-surface-variant overflow-auto leading-relaxed">
            <code>{INTEGRATION_SNIPPET}</code>
          </pre>
          <p className="text-xs text-on-surface-variant mt-3">
            Graph automatically falls back to original content for any variation key
            that has no matching CMS variation — so adding the filter is always safe,
            even before editors create any variants.
          </p>
        </section>

      </div>
    </div>
  );
}
