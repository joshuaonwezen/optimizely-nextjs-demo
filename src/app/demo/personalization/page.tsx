import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { getVisitorContext } from "@/lib/optimizely/visitor";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";

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
            Know who your visitor is at request time - device, persona, auth state, geo -
            before a single byte of HTML is streamed. All audience signals are collected
            server-side and fed into Feature Experimentation, which decides which content
            variant each segment receives.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
              ✓ Zero client JS
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Server-side attribute collection
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
              Feeds FX audience targeting
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* How audience targeting works */}
        <section id="how-it-works">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How Audience Targeting Works{" "}
            <a href="#how-it-works" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Before any component renders, three things happen in sequence. Every signal is
            collected server-side - nothing is deferred to the browser.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">1</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Collect signals</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                On every request,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>{" "}
                builds an attribute map from cookies and request headers:{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">device</code> from
                the User-Agent,{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code> and{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in</code> from
                cookies, plus any signals you add - geo, auth session, query params.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">2</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Classify against audiences</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Feature Experimentation evaluates the attribute map against audience rules
                you define in the FX dashboard - entirely server-side with no extra network call.
                A visitor matching{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "business"</code>{" "}
                receives the{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">business</code>{" "}
                variation key.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center mb-4">
                <span className="text-brand font-bold font-mono text-sm">3</span>
              </div>
              <h3 className="font-display font-semibold text-on-surface mb-2">Serve the right experience</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                The variation key drives what the visitor sees - a different CMS page composition,
                different feature variable values, or a separate layout entirely. Editors manage
                content variants in Visual Builder; the SDK wires audience targeting at request time
                with no code change per experiment.
              </p>
            </div>
          </div>
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
              <pre className="p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                <code>{`// Audience Switcher → POST /api/demo/set-persona
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
//   logged_in == true      → your custom audience`}</code>
              </pre>
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
            Audience Attributes &amp; Targeting Criteria{" "}
            <a href="#audience-attributes" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            FX audiences are matched against the attributes you return from{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code>.
            Everything is evaluated server-side - headers, cookies, auth sessions, geo data, and
            any database value are available before HTML is streamed. Below are practical
            patterns for the most common attribute sources.
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
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/lib/optimizely/visitor.ts
// No cookie - derived from headers() on every request
const ua = headerStore.get("user-agent") ?? "";
const device = /mobile|android|iphone|ipad/i.test(ua)
  ? "mobile"
  : "desktop";

// Included automatically in getOptimizelyUser() attributes
// FX audience condition: device = "mobile"`}</code>
                </pre>
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
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/lib/optimizely/visitor.ts
const persona = cookieStore.get("demo_persona")?.value;

// In production: replace cookie with real enrichment
// e.g. from your CRM or database:
// const persona = await getUserSegment(userId);

// FX audience conditions:
//   persona = "personal"
//   persona = "business"`}</code>
                </pre>
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
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`import { getServerSession } from "next-auth";
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
//   role = "admin"`}</code>
                </pre>
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
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/lib/optimizely/visitor.ts - extend with geo
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
// FX audience: country = "GB"`}</code>
                </pre>
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
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// src/app/[[...slug]]/page.tsx
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
}`}</code>
                </pre>
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
                    <li>→ <strong className="text-on-surface">String match:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">persona = "business"</code></li>
                    <li>→ <strong className="text-on-surface">Boolean:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">logged_in = true</code></li>
                    <li>→ <strong className="text-on-surface">Substring:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">plan contains "premium"</code></li>
                    <li>→ <strong className="text-on-surface">Numeric range:</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">account_age_days &gt; 30</code></li>
                  </ul>
                </div>
                <pre className="bg-surface-low rounded-xl p-4 text-xs font-mono text-on-surface-variant leading-relaxed overflow-auto">
                  <code>{`// Pass everything you know about the user
const { userId, attributes } = await getVisitorContext();
const decision = await getDecision("homepage_audience", userId, {
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
// Zero client-side data exposure.`}</code>
                </pre>
              </div>
            </div>

          </div>
        </section>

        {/* How this connects to Feature Experimentation */}
        <section id="integration-code">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            How This Connects to Feature Experimentation{" "}
            <a href="#integration-code" className="ml-1 text-brand/30 hover:text-brand transition-colors font-normal text-lg">#</a>
          </h2>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Audience attributes are the bridge between visitor identity and experiment bucketing.
            The signals you collect here flow directly into the FX SDK, which decides which
            variation key a visitor receives - and that key determines which CMS content variant
            Graph returns.
          </p>

          {/* Pipeline */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 mb-6">
            <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-4">
              From audience signal to personalized CMS content
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 min-w-[130px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">Audience signals</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">device, persona, geo, auth</p>
                  <p className="text-[10px] font-mono text-on-surface-variant mt-1">getVisitorContext()</p>
                </div>
              </div>
              <div className="text-on-surface-variant text-lg">→</div>
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 min-w-[130px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">FX SDK</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">evaluates audience rules</p>
                  <p className="text-[10px] font-mono text-brand mt-1">→ variationKey</p>
                </div>
              </div>
              <div className="text-on-surface-variant text-lg">→</div>
              <div className="text-center">
                <div className="bg-surface-low rounded-xl px-4 py-3 min-w-[130px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">Graph query</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">variation filter applied</p>
                  <p className="text-[10px] font-mono text-on-surface-variant mt-1">getContentByPath()</p>
                </div>
              </div>
              <div className="text-on-surface-variant text-lg">→</div>
              <div className="text-center">
                <div className="bg-brand/10 border border-brand/30 rounded-xl px-4 py-3 min-w-[130px]">
                  <p className="text-xs font-mono font-semibold text-on-surface">CMS variant</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">matched by variation name</p>
                  <p className="text-[10px] font-mono text-brand mt-1">or original fallback</p>
                </div>
              </div>
            </div>
          </div>

          {/* What each page covers */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded bg-brand/10 flex items-center justify-center shrink-0">
                  <span className="text-brand text-[10px] font-bold">P</span>
                </span>
                <h3 className="font-display font-semibold text-on-surface text-sm">This page covers</h3>
              </div>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Collecting audience signals (device, persona, geo, auth)</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Extending <code className="bg-surface-low px-1 rounded font-mono text-xs">getVisitorContext()</code> with new attribute sources</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> FX audience condition types - string, boolean, numeric, substring</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> The Audience Switcher demo tool and the cookies it sets</li>
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
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Creating flags, experiments, and variation keys in the FX dashboard</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Connecting FX variation keys to CMS content variations in Visual Builder</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Feature variables - typed values delivered per variation</li>
                <li className="flex gap-2"><span className="text-brand shrink-0">→</span> Impression events, experiment results, and winner declaration</li>
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
              href="/demo/feature-experimentation#integration-code"
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
              <code className="bg-surface-low px-1 rounded font-mono text-xs">country = "GB"</code>).
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
    </div>
  );
}
