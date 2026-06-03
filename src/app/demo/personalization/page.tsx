export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAllDecisions, type FxDecision } from "@/lib/optimizely/experimentation";

export const metadata: Metadata = {
  title: "Personalization & Audiences",
};

const INTEGRATION_SNIPPET = `// src/app/[[...slug]]/page.tsx
import { cookies } from "next/headers";
import { getClient } from "@optimizely/cms-sdk";
import { OptimizelyComponent, withAppContext } from "@optimizely/cms-sdk/react/server";
import { getAllDecisions } from "@/lib/optimizely/experimentation";
import { initComponentRegistry } from "@/lib/optimizely/componentRegistry";

initComponentRegistry(); // also calls config() so getClient() works

async function CmsPage({ params }) {
  const cookieStore = await cookies();

  // 1. Stable user ID from middleware cookie
  const userId = cookieStore.get("fx_user_id")?.value ?? "anonymous";

  // 2. Build attributes — persona from audience switcher, device from middleware
  const device    = cookieStore.get("fx_device")?.value ?? "desktop";
  const persona   = cookieStore.get("demo_persona")?.value;
  const loggedIn  = cookieStore.get("demo_logged_in")?.value === "true";

  const attributes = {
    device,
    logged_in: loggedIn,
    ...(persona ? { persona } : {}),
  };

  // 3. Evaluate ALL FX flags for this user + attributes
  const decisions = await getAllDecisions(userId, attributes);

  // 4. Collect active variation keys
  const activeVariations = Object.values(decisions)
    .filter((d) => d.enabled && d.variationKey && d.variationKey !== "off")
    .map((d) => d.variationKey as string);

  // 5. URL-based content lookup — Graph returns base + variation when a filter
  //    is active, so we prefer the variation match from the returned array.
  const variationFilter = activeVariations.length > 0
    ? { variation: { include: "SOME" as const, value: activeVariations, includeOriginal: true } }
    : undefined;

  const client = getClient();
  const slug = (await params).slug as string[] | undefined;
  const items = await client.getContentByPath(
    \`/en/\${slug?.join("/") ?? ""}/\`,
    { ...variationFilter, cache: false },
  );
  const variationMatch = variationFilter
    ? items.find((item) => activeVariations.includes(item._metadata?.variation))
    : null;
  const page = variationMatch ?? items[0];

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
  const demoPersona = cookieStore.get("demo_persona")?.value;
  const demoLoggedIn = cookieStore.get("demo_logged_in")?.value === "true";

  const attributes = {
    device,
    logged_in: demoLoggedIn,
    ...(demoPersona ? { persona: demoPersona } : {}),
  };

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
            Personalization &amp; Audiences
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
                On every request, the FX SDK evaluates all flags for this user and their
                attributes. When a flag is enabled and the user matches an audience rule,
                it returns a{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs mx-0.5">variationKey</code>
                like <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> or{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>.
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
                filter. Graph returns both the base and any matching variation — the code
                prefers the variation match.
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
                (e.g. <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code>).
                No code change required — the key is the contract between FX and CMS.
              </p>
            </div>
          </div>
        </section>

        {/* Demo: Audience Switcher */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Demo: Audience Switcher
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The floating pill in the bottom-right corner is a demo-only tool. It lets a presenter
            instantly switch between audience variants without needing to be randomly bucketed by
            FX — useful for showing clients exactly which content each segment sees.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">How it works</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                The switcher sets two cookies that are passed as FX attributes on every server
                request. Configure matching audience rules in the FX console and the SDK will
                return the right variation key automatically.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Persona</p>
                  <div className="space-y-1.5">
                    {[
                      { key: "personal", note: "persona = \"personal\"" },
                      { key: "business", note: "persona = \"business\"" },
                    ].map(({ key, note }) => (
                      <div key={key} className="flex items-center justify-between gap-3 text-sm">
                        <code className="font-mono text-xs bg-surface-low px-2 py-0.5 rounded text-on-surface">{key}</code>
                        <span className="text-xs text-on-surface-variant">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Auth State</p>
                  <div className="space-y-1.5">
                    {[
                      { label: "Guest",     note: "logged_in = false" },
                      { label: "Logged In", note: "logged_in = true" },
                    ].map(({ label, note }) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-on-surface font-medium text-xs">{label}</span>
                        <span className="text-xs text-on-surface-variant font-mono">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">src/app/{"[[...slug]]"}/page.tsx</span>
              </div>
              <pre className="p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                <code>{`// Build attributes from cookies
const persona  = cookieStore.get("demo_persona")?.value;
const loggedIn = cookieStore.get("demo_logged_in")?.value === "true";

const attributes = {
  device,
  logged_in: loggedIn,
  ...(persona ? { persona } : {}),
};

// FX evaluates audience rules against these attributes
const decisions = await getAllDecisions(userId, attributes);
const activeVariations = Object.values(decisions)
  .filter((d) => d.enabled && d.variationKey !== "off")
  .map((d) => d.variationKey as string);

// Graph returns base + variation — prefer the variation match
const variationFilter = activeVariations.length > 0
  ? { variation: { include: "SOME", value: activeVariations,
                   includeOriginal: true } }
  : undefined;

const items = await client.getContentByPath(url, {
  ...variationFilter, cache: false
});
const variationMatch = variationFilter
  ? items.find((i) => activeVariations.includes(i._metadata?.variation))
  : null;
const page = variationMatch ?? items[0];`}</code>
              </pre>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>CMS variations must be created in Visual Builder — the Management API cannot create them.</strong>{" "}
              The <code className="bg-amber-100 px-1 rounded font-mono text-xs">variation</code> field is silently
              ignored on write. Once you create a variation in Visual Builder it becomes a new draft{" "}
              <strong>version</strong> — you can then update its composition programmatically by PATCHing
              that version number (see <code className="bg-amber-100 px-1 rounded font-mono text-xs">scripts/update-homepage-variations.ts</code>).
              For this demo: open the homepage in Visual Builder, click <strong>Add variation</strong>, and
              create two variations named exactly{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">personal</code> and{" "}
              <code className="bg-amber-100 px-1 rounded font-mono text-xs">business</code>,
              then run the update script to populate their content.
            </p>
          </div>
        </section>

        {/* Your session */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Your Session
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The table below shows every FX flag evaluated for your stable user ID using
            the current attribute values. Flags with an active variation key are the ones
            that influence which CMS content variant is served on other pages.
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
                  <code className={`text-sm font-mono ${demoLoggedIn ? "text-brand" : "text-on-surface"}`}>
                    {String(demoLoggedIn)}
                  </code>
                </div>
                {demoPersona && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                      persona
                    </span>
                    <code className="text-sm font-mono text-brand">{demoPersona}</code>
                  </div>
                )}
              </div>
              {!demoPersona && !demoLoggedIn && (
                <p className="mt-4 text-xs text-on-surface-variant italic">
                  Use the audience switcher to set <code className="font-mono">persona</code> or{" "}
                  <code className="font-mono">logged_in</code> and see the attributes update here.
                </p>
              )}
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
                  Enable a flag and configure an audience rule in the FX dashboard.
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
              In the FX dashboard, create a flag — for this demo it&apos;s{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">homepage_audience</code> — and
              define two named variations:{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> (33%) and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code> (33%), with{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">off</code> (34%) as the holdout.
              Add audience conditions using the{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code> attribute
              (e.g. <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "personal"</code>)
              so the switcher deterministically routes visitors to the right variant.
              The exact variation key strings become the contract with the CMS.
            </Step>

            <Step number={2} title="Create variations in Visual Builder, then update via script">
              Open the homepage in the CMS Visual Builder. Click{" "}
              <strong>Add variation</strong> in the right-hand panel. Create two variations named
              exactly{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code> and{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>{" "}
              (case-sensitive). Each variation is saved as a new draft <strong>version</strong>.
              Once created, run{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">npx tsx scripts/update-homepage-variations.ts</code>{" "}
              to PATCH those versions with the correct compositions and publish them.
            </Step>

            <Step number={3} title="Each audience gets its own homepage">
              Users bucketed into{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">personal</code>{" "}
              see a personal banking focus; users in{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>{" "}
              see business banking content. The 34% holdout sees the original
              homepage — no extra work because{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">includeOriginal: true</code>.
            </Step>

            <Step number={4} title="Validate with the Audience Switcher">
              Use the floating switcher in the bottom-right corner to preview each variation
              instantly without waiting for FX bucketing. Select{" "}
              <strong>Business Banking</strong> — the page should show &ldquo;Banking built for
              business&rdquo;. You can also toggle the <strong>Auth State</strong> to{" "}
              <strong>Logged In</strong> and combine it with a persona to test multi-attribute
              audience rules.
            </Step>

            <Step number={5} title="Launch the experiment">
              Enable the flag and start the experiment in the FX dashboard. FX handles bucketing
              and traffic allocation; the CMS Graph API handles content delivery. Analytics and
              winner declaration happen in the FX Results dashboard.
            </Step>
          </div>
        </section>

        {/* Audience attributes */}
        <section>
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Audience Attributes &amp; Targeting Criteria
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            FX audiences are matched against the attributes you pass to{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getAllDecisions</code>.
            Everything is evaluated server-side — headers, cookies, auth sessions, geo data, and
            any database value are all available before the HTML is streamed. Below are practical
            patterns for the most common attribute sources.
          </p>

          <div className="space-y-8">

            {/* 1 — Device / UA */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">1</span>
                <h3 className="font-display font-semibold text-on-surface">Device &amp; User-Agent (already live)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Middleware parses the User-Agent and writes a{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">fx_device</code> cookie
                    before any page logic runs. Use it to target mobile vs desktop audiences in FX.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Your current device attribute: <strong className="text-on-surface font-mono">{device}</strong>
                  </p>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/middleware.ts
const ua = req.headers.get("user-agent") ?? "";
const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
res.cookies.set("fx_device", isMobile ? "mobile" : "desktop");

// In your page / Server Component:
const device = cookieStore.get("fx_device")?.value ?? "desktop";
await getAllDecisions(userId, { device });
// FX audience condition: device = "mobile"`}</code>
                </pre>
              </div>
            </div>

            {/* 2 — Persona / audience switcher */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">2</span>
                <h3 className="font-display font-semibold text-on-surface">Persona (already live — set by the Audience Switcher)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    The Audience Switcher sets a <code className="bg-surface-low px-1 rounded font-mono text-xs">demo_persona</code> cookie.
                    The catch-all page reads it and passes it as the{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code> attribute to FX.
                    Configure audience rules in the FX dashboard to target{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "personal"</code> or{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "business"</code>.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Current value:{" "}
                    <strong className="text-on-surface font-mono">
                      {demoPersona ? `"${demoPersona}"` : "not set"}
                    </strong>
                  </p>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// Audience Switcher → POST /api/demo/set-persona
// Sets demo_persona cookie (1-day maxAge)

// In the catch-all page:
const persona = cookieStore.get("demo_persona")?.value;
await getAllDecisions(userId, {
  device,
  ...(persona ? { persona } : {}),
});
// FX audience: persona = "personal"
//              persona = "business"`}</code>
                </pre>
              </div>
            </div>

            {/* 3 — Auth / logged-in state */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">3</span>
                <h3 className="font-display font-semibold text-on-surface">Auth session (logged-in state — also live via the switcher)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Toggle <strong>Logged In</strong> in the Audience Switcher to flip{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in</code> between
                    true and false. In a real app, read your auth session instead and use the user&apos;s
                    stable account ID as{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">userId</code> for
                    consistent cross-device bucketing.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Current value:{" "}
                    <strong className={`font-mono ${demoLoggedIn ? "text-brand" : "text-on-surface"}`}>
                      {String(demoLoggedIn)}
                    </strong>
                  </p>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`import { getServerSession } from "next-auth";
// or: import { auth } from "@/auth"; // Auth.js v5

const session = await getServerSession();

// Use account ID for stable cross-device bucketing
const userId =
  session?.user?.id ??
  cookieStore.get("fx_user_id")?.value ??
  "anonymous";

await getAllDecisions(userId, {
  device,
  logged_in:  Boolean(session),
  plan:       session?.user?.plan ?? "free",
  role:       session?.user?.role ?? "guest",
});
// FX audiences:
//   logged_in = true
//   plan = "premium"
//   role = "admin"`}</code>
                </pre>
              </div>
            </div>

            {/* 4 — Geo */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">4</span>
                <h3 className="font-display font-semibold text-on-surface">Geo / Country (request headers)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Vercel, Cloudflare, and most edge runtimes inject geo headers on every request.
                    Read them in middleware and write them to cookies, or read them directly in a
                    Server Component via <code className="bg-surface-low px-1 rounded font-mono text-xs">headers()</code>.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Common use cases: UK-only promotions, GDPR consent audiences, regional pricing.
                  </p>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/middleware.ts
const country =
  req.geo?.country ??                         // Vercel
  req.headers.get("cf-ipcountry") ??          // Cloudflare
  req.headers.get("x-vercel-ip-country") ??   // Vercel alt
  "unknown";
res.cookies.set("fx_country", country);

// In your page:
import { headers } from "next/headers";
const hdrs = await headers();
const country =
  hdrs.get("x-vercel-ip-country") ?? "unknown";

await getAllDecisions(userId, { country });
// FX audience: country = "GB"`}</code>
                </pre>
              </div>
            </div>

            {/* 5 — URL / query params */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">5</span>
                <h3 className="font-display font-semibold text-on-surface">URL &amp; query parameters (UTM, campaign, force-bucket)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Query params are available in Server Components via{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">searchParams</code>.
                    Use them to target campaign traffic, enable QA force-bucketing, or segment by
                    referral source.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    UTM parameters identify paid traffic — e.g. show a different hero to users
                    arriving from a Google Ads campaign.
                  </p>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/app/[[...slug]]/page.tsx
export default async function CmsPage({
  params,
  searchParams,  // add this prop
}) {
  const sp = await searchParams;

  await getAllDecisions(userId, {
    device,
    utm_source:   sp.utm_source ?? "direct",
    utm_medium:   sp.utm_medium ?? "none",
    utm_campaign: sp.utm_campaign ?? "none",
  });
  // FX audience: utm_source = "google"
}`}</code>
                </pre>
              </div>
            </div>

            {/* 6 — Combining attributes */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">6</span>
                <h3 className="font-display font-semibold text-on-surface">Combining attributes — audience conditions in FX</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    All attributes are available as conditions in the FX dashboard when building
                    an audience. Combine them with AND/OR/NOT to create precise segments.
                    The SDK evaluates conditions locally against the attribute map — no network
                    call per decision.
                  </p>
                  <ul className="space-y-1 text-sm text-on-surface-variant leading-relaxed">
                    <li>→ <strong className="text-on-surface">String match:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "business"</code></li>
                    <li>→ <strong className="text-on-surface">Boolean:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in = true</code></li>
                    <li>→ <strong className="text-on-surface">Substring:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">plan contains "premium"</code></li>
                    <li>→ <strong className="text-on-surface">Numeric range:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">account_age_days &gt; 30</code></li>
                  </ul>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// Pass everything you know about the user
await getAllDecisions(userId, {
  // From middleware / cookies
  device,                     // "mobile" | "desktop"
  persona,                    // "personal" | "business"

  // From auth session
  logged_in: Boolean(session),
  plan:       session?.user?.plan ?? "free",
  account_age_days: session?.user?.ageDays ?? 0,

  // From geo headers
  country,                    // "GB" | "US" | …

  // From query params
  utm_source: sp.utm_source ?? "direct",
});
// FX evaluates ALL of these server-side.
// Zero client-side data exposure.`}</code>
                </pre>
              </div>
            </div>

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
