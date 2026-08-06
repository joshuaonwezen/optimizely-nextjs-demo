import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import { queryOdpSegments, resolveVariationKey, ODP_SEGMENT_TO_VARIATION } from "@/lib/optimizely/odp";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";

export const dynamic = "force-dynamic";

const userTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/user.ts"),
  "utf8"
);
const catchAllTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/[[...slug]]/page.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Personalization & Audiences",
};

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

function MatchRow({
  condition,
  value,
  matches,
}: {
  condition: string;
  value: string;
  matches: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-ghost-border last:border-0">
      <code className="font-mono text-xs text-on-surface">{condition}</code>
      <div className="flex items-center gap-3">
        <code className="text-xs font-mono text-on-surface-variant shrink-0">{value}</code>
        <span
          className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            matches ? "bg-green-100 text-green-800" : "bg-surface-low text-on-surface-variant"
          }`}
        >
          {matches ? "matches" : "no match"}
        </span>
      </div>
    </div>
  );
}

export default async function PersonalizationDemoPage() {
  const { userId, attributes } = await getVisitorContext();
  const device = attributes.device as string;
  const demoLoggedIn = attributes.logged_in as boolean;
  const demoPersona = attributes.persona as string | undefined;

  const odpSegments = await queryOdpSegments(userId);
  const odpVariationKey = resolveVariationKey(odpSegments);
  const odpConfigured = !!process.env.OPTIMIZELY_ODP_API_KEY;
  const mappingEntries = Object.entries(ODP_SEGMENT_TO_VARIATION);

  return (
    <>
      <DemoHero
        title="Personalization & Audiences"
        description="Know who your visitor is at request time - device, persona, auth state, geo - and feed that into Feature Experimentation to decide which content variant each segment sees. This page goes deep on where those audience signals come from: lightweight native attributes evaluated in-process, or ODP segments built from behavior over time."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ Native attributes
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            In-process, no network call
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            ODP behavioral layer
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Section A - recap of the generic flow; full walkthrough lives on the FX page */}
        <section id="how-it-works">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The Flow, in One Glance{" "}
            <a href="#how-it-works" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Personalization is one input to the same pipeline the{" "}
            <Link href="/demo/feature-experimentation#how-it-works" className="text-brand hover:underline">Feature Experimentation</Link>{" "}
            page walks through end to end. Whatever you know about a visitor at request time is turned
            into a variation key, and that key selects the CMS content Graph returns. This page focuses
            on <strong>where those audience signals come from</strong> - not the FX and Graph plumbing.
          </p>

          {/* Pipeline strip */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              From audience signal to personalized CMS content
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: "Audience signal", sub: "device, persona, geo, behavior" },
                { label: "FX decision", sub: "audience rules → variationKey" },
                { label: "Graph filter", sub: "getContentByPath()" },
                { label: "CMS variant", sub: "or original fallback", highlight: true },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div className={`text-center rounded-xl px-4 py-3 min-w-[130px] ${step.highlight ? "bg-brand/10 border border-brand/30" : "bg-surface-low"}`}>
                    <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
                    <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
                  </div>
                  {i < arr.length - 1 && <span className="text-on-surface-variant text-lg">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* This page vs FX page */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand text-[10px] font-bold">P</span>
                </span>
                <h3 className="font-display font-semibold text-on-surface text-sm">This page covers</h3>
              </div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> The two sources for FX audiences - native attributes vs ODP segments</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Collecting native signals (device, persona, geo, auth) via <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code></li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Extending the visitor context with new attributes</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Using ODP as a behavioral layer for deeper targeting</li>
              </ul>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand text-[10px] font-bold">FX</span>
                </span>
                <h3 className="font-display font-semibold text-on-surface text-sm">
                  <Link href="/demo/feature-experimentation" className="hover:text-brand transition-colors">
                    Feature Experimentation page covers →
                  </Link>
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> The Configure and Serve lifecycle and the flag/variation contract</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Connecting FX variation keys to CMS content variations</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Middleware, user helper, catch-all route, and impression firing</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Your live flag decisions and active variation keys</li>
              </ul>
            </div>
          </div>

          {/* Deep links into FX page */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/demo/feature-experimentation#how-it-works"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">FX Guide</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Architecture Overview
              </p>
              <p className="text-xs text-on-surface-variant">
                How FX SDK, Graph, and CMS Variations fit together end-to-end
              </p>
            </Link>
            <Link
              href="/demo/feature-experimentation#setup-guide"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">FX Guide</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Setting Up CMS Variations
              </p>
              <p className="text-xs text-on-surface-variant">
                Step-by-step: flags in FX dashboard, Visual Builder, update script
              </p>
            </Link>
            <Link
              href="/demo/feature-experimentation#code-middleware"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">FX Guide</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Integration Code
              </p>
              <p className="text-xs text-on-surface-variant">
                Middleware, user helper, catch-all route, and impression firing
              </p>
            </Link>
          </div>
        </section>

        {/* Section B - the two sources for FX audiences */}
        <section id="targeting-sources">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Two Ways to Target Audiences: Native Attributes vs ODP{" "}
            <a href="#targeting-sources" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            An FX audience can be fed from two very different sources. The first is built into your app
            and costs nothing extra; the second is a dedicated data layer that sits in front of FX and
            remembers what a visitor did over time. Both resolve to the same variation key - they differ
            in what they can express and what they cost.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Native */}
            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-on-surface">Native FX attributes</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">default · app-native</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Attributes you already know at request time -{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">device</code>,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code>,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in</code>, geo, plan, UTM - are
                collected by <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code> and passed
                straight into <code className="bg-surface-low px-1 rounded font-mono text-xs">user.decide()</code>. The SDK matches
                them against your audience rules <strong>locally, in-process</strong> - no extra service, no network round-trip.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Zero network calls - evaluated in the same request</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">One-file setup: add to visitor.ts, define the FX condition</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">Only sees this request - no memory of past behavior</span></div>
              </div>
            </div>

            {/* ODP */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-on-surface">ODP segments</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">behavioral layer</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                ODP is a customer data platform that <strong>sits between the visitor and FX</strong>. It ingests
                behavioral events over time, builds a persistent per-visitor profile, and computes{" "}
                <strong>segments</strong>. An FX audience can reference an ODP segment; qualifying the visitor
                requires a <strong>network call</strong> to ODP. Use it when targeting depends on history a single
                request can&apos;t see - &ldquo;viewed pricing 3x this week&rdquo;, high-value customer, churn risk.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Remembers behavior across sessions and devices</span></div>
                <div className="flex gap-2"><span className="text-green-600 font-bold shrink-0">+</span><span className="text-on-surface-variant">Rich segments from events, not just request facts</span></div>
                <div className="flex gap-2"><span className="text-amber-600 font-bold shrink-0">-</span><span className="text-on-surface-variant">Network call + latency; needs event instrumentation and an ODP account</span></div>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ghost-border">
                    <th className="text-left font-mono text-xs text-on-surface-variant uppercase tracking-wider px-5 py-3 font-medium">Dimension</th>
                    <th className="text-left font-display font-semibold text-on-surface px-5 py-3">Native attributes</th>
                    <th className="text-left font-display font-semibold text-on-surface px-5 py-3">ODP segments</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Signal source", "Cookies + request headers, in your app", "Behavioral events ingested into ODP"],
                    ["Where evaluated", "In-process, same request", "ODP computes; FX reads via a lookup"],
                    ["Network call", "None", "Yes - request to ODP"],
                    ["Persists across sessions", "No - only what this request carries", "Yes - stored on the profile"],
                    ["Captures behavior over time", "No", "Yes - events accumulate into segments"],
                    ["Setup cost", "One-file change + FX audience condition", "Event instrumentation + ODP account + mapping"],
                    ["Best for", "Request-time facts: device, geo, auth, plan", "History and intent: RFM, high-value, churn risk"],
                  ].map(([dim, native, odp]) => (
                    <tr key={dim} className="border-b border-ghost-border last:border-0">
                      <td className="px-5 py-3 font-mono text-xs text-on-surface align-top">{dim}</td>
                      <td className="px-5 py-3 text-on-surface-variant align-top">{native}</td>
                      <td className="px-5 py-3 text-on-surface-variant align-top">{odp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Callout variant="note">
            <strong>Both paths end the same way.</strong> Native attributes and ODP segments both resolve to a
            variation key that runs the identical{" "}
            <Link href="/demo/feature-experimentation#how-it-works" className="text-brand hover:underline">FX → Graph → CMS pipeline</Link>.
            ODP simply adds a data layer <em>before</em> the FX decision. Start native; reach for ODP when a
            single request can&apos;t tell you what you need to know.
          </Callout>
        </section>

        {/* Audience Switcher */}
        <section id="audience-switcher">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Demo: Audience Switcher{" "}
            <a href="#audience-switcher" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The floating pill in the bottom-right corner lets a presenter instantly switch
            between audience segments without waiting for FX bucketing - useful for showing
            clients exactly which content each segment sees.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">What it sets</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                The switcher writes two cookies that{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
                picks up on every subsequent server request. These map directly to FX audience conditions
                - no client-side SDK involved.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Persona</p>
                  <div className="space-y-1.5">
                    {[
                      { key: "personal", note: 'demo_persona = "personal"' },
                      { key: "business", note: 'demo_persona = "business"' },
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
                      { label: "Guest", note: "demo_logged_in = false" },
                      { label: "Logged In", note: "demo_logged_in = true" },
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
                <span className="text-xs font-mono text-on-surface-variant">src/lib/optimizely/visitor.ts</span>
              </div>
              <CodeBlock code={`// Audience Switcher → POST /api/demo/set-persona
// Sets demo_persona cookie (1-day maxAge)

// visitor.ts reads it on every server request:
const persona = cookieStore.get("demo_persona")?.value;
const loggedIn =
  cookieStore.get("demo_logged_in")?.value === "true";

// Both are included in the FX attribute map:
// { device: "desktop", persona: "personal", logged_in: true }

// FX evaluates these against audience conditions:
//   persona == "personal"  → variation key: "personal"
//   persona == "business"  → variation key: "business"
//   logged_in == true      → your custom audience`} />
            </div>
          </div>

          <Callout variant="warning">
            <strong>The Audience Switcher is demo tooling only.</strong>{" "}
            In production, replace the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">demo_persona</code> cookie
            with real audience signals - auth session data, CRM enrichment, or onboarding answers.
            The FX audience conditions and targeting logic stay the same; only the attribute source changes.
          </Callout>
        </section>

        {/* Your session */}
        <section id="your-session">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Your Session{" "}
            <a href="#your-session" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The attributes below are what{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
            resolved for your current request. These are passed to Feature Experimentation as your
            audience attribute map on every page load - no round-trip, evaluated entirely in-process.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-4">Current Attributes</h3>
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
                {demoPersona ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                      persona
                    </span>
                    <code className="text-sm font-mono text-brand">{demoPersona}</code>
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic pt-1">
                    No persona set - use the audience switcher to add one.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-1">
                Audience Condition Preview
              </h3>
              <p className="text-xs text-on-surface-variant mb-4">
                How FX evaluates common audience conditions against your current attributes.
                Use the switcher to see these update in real time.
              </p>
              <div>
                <MatchRow
                  condition='persona = "personal"'
                  value={demoPersona ?? "not set"}
                  matches={demoPersona === "personal"}
                />
                <MatchRow
                  condition='persona = "business"'
                  value={demoPersona ?? "not set"}
                  matches={demoPersona === "business"}
                />
                <MatchRow
                  condition="logged_in = true"
                  value={String(demoLoggedIn)}
                  matches={demoLoggedIn}
                />
                <MatchRow
                  condition='device = "mobile"'
                  value={device}
                  matches={device === "mobile"}
                />
                <MatchRow
                  condition='device = "desktop"'
                  value={device}
                  matches={device === "desktop"}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 bg-surface-lowest border border-ghost-border rounded-2xl p-5 flex items-start gap-4">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center">
              <span className="text-brand font-bold font-mono text-[10px] leading-none">FX</span>
            </div>
            <div>
              <p className="font-display font-semibold text-on-surface mb-1">
                See your live flag decisions on the Feature Experimentation page
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The Feature Experimentation demo shows which flags are enabled for your session,
                the variation keys being passed to Graph, and the exact CMS content filter
                applied on every page request.
              </p>
              <Link
                href="/demo/feature-experimentation#your-session"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
              >
                View your session on the FX demo →
              </Link>
            </div>
          </div>
        </section>

        {/* Audience attributes */}
        <section id="audience-attributes">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Native Attributes in Depth{" "}
            <a href="#audience-attributes" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The native path in detail. FX audiences are matched against the attributes you return from{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>,
            all evaluated in-process - headers, cookies, auth sessions, geo data, and any database
            value are available before HTML is streamed, with no network call to a separate service.
            Below are practical patterns for the most common attribute sources.
          </p>

          <div className="space-y-8">

            {/* 1 - Device / UA */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">1</span>
                <h3 className="font-display font-semibold text-on-surface">Device &amp; User-Agent (already live)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    The User-Agent header is parsed server-side on every request - no cookie
                    stored (GDPR safe). Use the{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">device</code>{" "}
                    attribute to target mobile vs desktop audiences in the FX dashboard.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Your current device attribute:{" "}
                    <strong className="text-on-surface font-mono">{device}</strong>
                  </p>
                </div>
                <CodeBlock code={`// src/lib/optimizely/visitor.ts
// No cookie - derived from headers() on every request
const ua = headerStore.get("user-agent") ?? "";
const device = /mobile|android|iphone|ipad/i.test(ua)
  ? "mobile"
  : "desktop";

// Included automatically in getOptimizelyUser() attributes
// FX audience condition: device = "mobile"`} />
              </div>
            </div>

            {/* 2 - Persona / audience switcher */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">2</span>
                <h3 className="font-display font-semibold text-on-surface">Persona (already live - set by the Audience Switcher)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    The Audience Switcher sets a{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">demo_persona</code>{" "}
                    cookie. <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
                    reads it and includes it in the attribute map as{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code>.
                    In production, replace the cookie with a real signal - segment from your CRM,
                    onboarding answers, or account type from a database.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Current value:{" "}
                    <strong className="text-on-surface font-mono">
                      {demoPersona ? `"${demoPersona}"` : "not set"}
                    </strong>
                  </p>
                </div>
                <CodeBlock code={`// src/lib/optimizely/visitor.ts
const persona = cookieStore.get("demo_persona")?.value;

// In production: replace cookie with real enrichment
// e.g. from your CRM or database:
// const persona = await getUserSegment(userId);

// FX audience conditions:
//   persona = "personal"
//   persona = "business"`} />
              </div>
            </div>

            {/* 3 - Auth / logged-in state */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">3</span>
                <h3 className="font-display font-semibold text-on-surface">Auth session (logged-in state - also live via the switcher)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Toggle <strong>Logged In</strong> in the Audience Switcher to simulate auth state.
                    In a real app, read your auth session directly and use the user&apos;s stable
                    account ID as <code className="bg-surface-low px-1 rounded font-mono text-xs">userId</code>{" "}
                    so bucketing is consistent across devices.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Current value:{" "}
                    <strong className={`font-mono ${demoLoggedIn ? "text-brand" : "text-on-surface"}`}>
                      {String(demoLoggedIn)}
                    </strong>
                  </p>
                </div>
                <CodeBlock code={`import { getServerSession } from "next-auth";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import { getDecision } from "@/lib/optimizely/experimentation";

const session = await getServerSession();
const { userId: cookieId, attributes } = await getVisitorContext();

// Use account ID for stable cross-device bucketing
const userId = session?.user?.id ?? cookieId;

const decision = await getDecision("premium_feature", userId, {
  ...attributes,
  logged_in:  Boolean(session),
  plan:       session?.user?.plan ?? "free",
  role:       session?.user?.role ?? "guest",
});
// FX audiences:
//   logged_in = true
//   plan = "premium"
//   role = "admin"`} />
              </div>
            </div>

            {/* 4 - Geo */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">4</span>
                <h3 className="font-display font-semibold text-on-surface">Geo / Country (request headers)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Vercel, Cloudflare, and most edge runtimes inject geo headers on every request.
                    Add them to{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
                    and they become available as FX audience conditions instantly.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Common use cases: region-specific promotions, GDPR consent audiences, local pricing.
                  </p>
                </div>
                <CodeBlock code={`// src/lib/optimizely/visitor.ts - extend with geo
import { headers } from "next/headers";

const hdrs = await headers();
const country =
  hdrs.get("x-vercel-ip-country") ??   // Vercel
  hdrs.get("cf-ipcountry") ??           // Cloudflare
  "unknown";

// Add to the attributes return value:
return {
  userId,
  attributes: { device, persona, logged_in, country },
};
// FX audience: country = "GB"`} />
              </div>
            </div>

            {/* 5 - URL / query params */}
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
                    referral source - no cookie write required.
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    UTM parameters identify paid traffic - e.g. show a different hero to users
                    arriving from a Google Ads campaign.
                  </p>
                </div>
                <CodeBlock code={`// src/app/[[...slug]]/page.tsx
export default async function CmsPage({
  params,
  searchParams,
}) {
  const sp = await searchParams;
  const { userId, attributes } = await getVisitorContext();

  const decision = await getDecision("campaign_hero", userId, {
    ...attributes,
    utm_source:   sp.utm_source ?? "direct",
    utm_medium:   sp.utm_medium ?? "none",
    utm_campaign: sp.utm_campaign ?? "none",
  });
  // FX audience: utm_source = "google"
}`} />
              </div>
            </div>

            {/* 6 - Combining attributes */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-on-brand text-xs font-bold shrink-0">6</span>
                <h3 className="font-display font-semibold text-on-surface">Combining attributes - audience conditions in FX</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    All attributes are available as conditions in the FX dashboard.
                    Combine them with AND/OR/NOT to create precise segments. The SDK evaluates
                    conditions locally against the attribute map - no network call per decision.
                  </p>
                  <ul className="space-y-1 text-sm text-on-surface-variant leading-relaxed">
                    <li>→ <strong className="text-on-surface">String match:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = &quot;business&quot;</code></li>
                    <li>→ <strong className="text-on-surface">Boolean:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in = true</code></li>
                    <li>→ <strong className="text-on-surface">Substring:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">plan contains &quot;premium&quot;</code></li>
                    <li>→ <strong className="text-on-surface">Numeric range:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">account_age_days &gt; 30</code></li>
                  </ul>
                </div>
                <CodeBlock code={`// Pass everything you know about the user
const { userId, attributes } = await getVisitorContext();
const decision = await getDecision("homepage", userId, {
  // From getVisitorContext() (device, persona, logged_in)
  ...attributes,

  // From auth session
  logged_in:        Boolean(session),
  plan:             session?.user?.plan ?? "free",
  account_age_days: session?.user?.ageDays ?? 0,

  // From geo headers
  country,

  // From query params
  utm_source: sp.utm_source ?? "direct",
});
// FX evaluates ALL of these server-side.
// Zero client-side data exposure.`} />
              </div>
            </div>

          </div>
        </section>

        {/* Extending the visitor context */}
        <section id="setup-guide">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Extending the Visitor Context{" "}
            <a href="#setup-guide" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Adding a new audience signal is a one-file change. Once an attribute flows into{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>,
            it becomes available as an FX audience condition with no further SDK configuration.
          </p>

          <div className="space-y-6 max-w-2xl">
            <Step number={1} title="Add the signal to getVisitorContext()">
              Open{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">
                src/lib/optimizely/visitor.ts
              </code>{" "}
              and add your attribute to the return value. Read from{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cookies()</code> for
              persisted values, <code className="bg-surface-low px-1 rounded font-mono text-xs">headers()</code>{" "}
              for request signals like geo or referrer, or await a database or auth session call
              for user-specific data. The function is called once per request via React{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">cache()</code>.
            </Step>

            <Step number={2} title="Register the attribute in the FX dashboard">
              In the Optimizely FX dashboard, go to <strong>Audiences &gt; Attributes</strong> and
              add the new attribute by name. The type (string, boolean, number) must match what
              you return. No SDK version bump required - the datafile update propagates within
              60 seconds.
            </Step>

            <Step number={3} title="Build an audience using the new attribute">
              Create a new audience in the FX dashboard with a condition on your attribute
              (e.g.{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">country = &quot;GB&quot;</code>).
              Assign the audience to a delivery rule on any flag. The string between the FX
              condition and your attribute key is the only coupling - it must match exactly
              (case-sensitive).
            </Step>

            <Step number={4} title="Test locally with the attribute set">
              For cookie-based attributes, set the cookie value directly in browser DevTools
              and reload - the audience condition evaluates immediately on the next request.
              For header-based attributes like geo, mock the header in middleware during local
              development, or use a VPN/proxy.
            </Step>

            <Step number={5} title="Validate on the Feature Experimentation page">
              Once your audience matches, the variation key will appear in your live flag
              decisions on the FX demo page - confirming the attribute is flowing correctly
              through to FX and the Graph variation filter.{" "}
              <Link
                href="/demo/feature-experimentation#your-session"
                className="text-brand hover:underline font-semibold"
              >
                View your session →
              </Link>
            </Step>
          </div>
        </section>

        {/* Section D - ODP as the behavioral layer for deeper targeting */}
        <section id="odp-personalization">
          <span id="variation-resolution" className="block" aria-hidden="true" />
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            ODP: The Behavioral Layer for Deeper Targeting{" "}
            <a href="#odp-personalization" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            ODP is the behavioral layer from the comparison above - a profile store that remembers
            what a visitor did over time. There are two ways to put it to work. Reference an ODP
            segment as an{" "}
            <Link href="/demo/feature-experimentation#audience-targeting" className="text-brand hover:underline">FX audience</Link>{" "}
            and the decision still runs through FX (experiments, hold-out groups, results). Or - for
            pure personalization with no experiment - skip FX entirely: query ODP for the visitor&apos;s
            segments, map a segment name to a CMS variation key, and pass it straight to Graph. The
            comparison below shows that ODP-direct path against the FX path; both feed the same Graph
            variation filter. For how ODP builds those profiles (identity stitching, events, segments),
            see the <Link href="/demo/odp" className="text-brand hover:underline">ODP page</Link>.
          </p>

          {/* Pipeline comparison */}
          <div className="space-y-3 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-3">
                Without FX - ODP direct
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { label: "ODP segments API", sub: "queryOdpSegments(userId)" },
                  { label: "Mapping config", sub: "ODP name → variation key" },
                  { label: "Graph variation filter", sub: "getContentByPath()" },
                  { label: "CMS variant", sub: "or original fallback", highlight: true },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className={`text-center rounded-xl px-4 py-3 min-w-[130px] ${step.highlight ? "bg-brand/10 border border-brand/30" : "bg-surface-low"}`}>
                      <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
                      <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
                    </div>
                    {i < arr.length - 1 && <span className="text-on-surface-variant text-lg">→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 opacity-60">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-3">
                With FX - for experiments
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { label: "Audience signals", sub: "getVisitorContext()" },
                  { label: "FX SDK", sub: "audience evaluation → variationKey" },
                  { label: "Graph variation filter", sub: "getContentByPath()" },
                  { label: "CMS variant", sub: "or original fallback" },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex items-center gap-3">
                    <div className="text-center bg-surface-low rounded-xl px-4 py-3 min-w-[130px]">
                      <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
                      <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
                    </div>
                    {i < arr.length - 1 && <span className="text-on-surface-variant text-lg">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Your ODP segments */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-1">Your ODP Segments</h3>
              <p className="text-xs text-on-surface-variant mb-4">
                Fetched server-side from ODP&apos;s GraphQL API using your{" "}
                <code className="bg-surface-low px-1 rounded font-mono">optimizelyEndUserId</code>{" "}
                as the visitor identifier.
              </p>
              {!odpConfigured ? (
                <p className="text-xs text-on-surface-variant italic">
                  ODP not configured - set{" "}
                  <code className="bg-surface-low px-1 rounded font-mono">OPTIMIZELY_ODP_API_KEY</code>{" "}
                  to enable.
                </p>
              ) : odpSegments.length === 0 ? (
                <p className="text-xs text-on-surface-variant italic">
                  No segments returned for this visitor.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {odpSegments.map((seg) => (
                    <span
                      key={seg}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium ${
                        ODP_SEGMENT_TO_VARIATION[seg]
                          ? "bg-brand/10 text-brand border border-brand/20"
                          : "bg-surface-low text-on-surface-variant"
                      }`}
                    >
                      {seg}
                      {ODP_SEGMENT_TO_VARIATION[seg] && (
                        <span className="ml-1.5 text-brand/60">→ {ODP_SEGMENT_TO_VARIATION[seg]}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-ghost-border">
                <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-1">Resolved variation key</p>
                {odpVariationKey ? (
                  <code className="text-sm font-mono text-brand">&quot;{odpVariationKey}&quot;</code>
                ) : (
                  <span className="text-sm text-on-surface-variant italic">none - original content served</span>
                )}
              </div>
            </div>

            {/* Mapping config */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">src/lib/optimizely/odp.ts</span>
              </div>
              <CodeBlock code={`// Decouples ODP segment names from CMS variation names.
// Update this map when either side renames something -
// no changes needed in FX dashboard or CMS UI.
export const ODP_SEGMENT_TO_VARIATION = {
${mappingEntries.length > 0
  ? mappingEntries.map(([seg, v]) => `  "${seg}": "${v}",`).join("\n")
  : `  // "high-value-customers": "business",
  // "retail-consumer":      "personal",`}
};`} />
            </div>
          </div>

          <Callout variant="note">
            <strong>When to use ODP direct vs FX.</strong>{" "}
            Use the ODP direct path when the goal is personalizing content for known segments - no
            control group, no statistical test. Use the FX path when you need to run a real
            experiment: split traffic, measure lift, and declare a winner with confidence. Both paths
            feed the same Graph variation filter - only the decision layer differs.{" "}
            <a href="https://github.com/episerver/content-js-sdk/blob/main/docs/5-fetching.md" target="_blank" rel="noopener" className="text-brand hover:underline">SDK docs ↗</a>
          </Callout>
        </section>

        <SourcePanel
          heading="Source files"
          files={[
            {
              label: "user.ts",
              path: "src/lib/optimizely/user.ts",
              content: userTs,
            },
            {
              label: "[[...slug]]/page.tsx",
              path: "src/app/[[...slug]]/page.tsx",
              content: catchAllTs,
            },
          ]}
        />

      </div>
    </>
  );
}
