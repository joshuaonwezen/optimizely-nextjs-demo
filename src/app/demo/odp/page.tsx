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
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";

export const dynamic = "force-dynamic";

const odpTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/odp.ts"),
  "utf8"
);
const odpSetupTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/OdpSetup.tsx"),
  "utf8"
);
const experimentationOdpTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/experimentationOdp.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "ODP: Profiles, Segments & Direct Personalization",
};

const ODP_TAG_SNIPPET = `// src/app/layout.tsx - the ODP tag is inlined in <head> so the zaius
// command queue exists synchronously during HTML parsing. Events fired
// before the async script loads are queued and replayed.

var zaius = window['zaius'] || (window['zaius'] = []);
zaius.methods = ['initialize','onload','customer','entity','event', /* ... */];
// ...queue shim...
e.src = 'https://d1igp3oop3iho5.cloudfront.net/v2/' +
        NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID + '/zaius-min.js';`;

const ODP_IDENTITY_SNIPPET = `// A client component mounted once in the root layout.
//
// ODP assigns every browser its own vuid cookie. To query segments
// server-side using the FX visitor ID, the two identities must be linked:
// send optimizelyEndUserId to ODP as the fs_user_id identifier once.

useEffect(() => {
  const fsUserId = getCookie("optimizelyEndUserId");
  if (fsUserId) window.zaius?.entity("customer", { fs_user_id: fsUserId });
}, []);

// SPA route changes don't reload the page, so fire a pageview per navigation:
useEffect(() => {
  window.zaius?.event("pageview");
}, [pathname]);`;

const ODP_SEGMENT_QUERY_SNIPPET = `// src/lib/optimizely/odp.ts - server-side segment membership query.
// Auth is the ODP API key in an x-api-key header (server-only env var).

// Look up by fs_user_id: the identity component stitches the visitor id into ODP under
// that identifier. Querying by vuid returns an empty customer.
const SEGMENT_QUERY = \`
  query GetSegments($userId: String!, $segmentFilter: [String!]!) {
    customer(fs_user_id: $userId) {
      audiences(subset: $segmentFilter) {
        edges { node { name state } }
      }
    }
  }
\`;

export async function queryOdpSegments(userId: string): Promise<string[]> {
  const res = await fetch(\`\${ODP_API_HOST}/v3/graphql\`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
    body: JSON.stringify({ query: SEGMENT_QUERY, variables: { userId, segmentFilter } }),
    next: { revalidate: 300 },   // segment membership changes slowly - cache it
  });
  // ...filter edges to state === "qualified", return segment names
}`;

const ODP_DIRECT_PATH_SNIPPET = `// Any Server Component - the complete ODP direct → Graph pipeline.
// No FX engine in the loop; just segments, a key, and a Graph filter.

import { getVisitorContext } from "@/lib/optimizely/visitor";
import { queryOdpSegments, resolveVariationKey } from "@/lib/optimizely/odp";
import { getClient } from "@optimizely/cms-sdk";

export default async function Page({ params }) {
  const { userId } = await getVisitorContext();

  // 1. Ask ODP which segments this visitor qualifies for.
  //    Only the segments in ODP_SEGMENT_TO_VARIATION are checked.
  //    Result is cached 300s - does not hit ODP on every page request.
  const segments = await queryOdpSegments(userId);

  // 2. Map the first qualifying segment to a CMS variation key.
  //    Returns undefined when no segment matches - original content served.
  const variationKey = resolveVariationKey(segments);

  // 3. Build the Graph variation filter and fetch the page.
  //    includeOriginal: true is required - without it, unmatched visitors
  //    get no content at all instead of the default page.
  const variationFilter = variationKey
    ? { variation: { include: "SOME" as const, value: [variationKey], includeOriginal: true } }
    : undefined;

  const url = "/" + ((await params).slug ?? []).join("/");
  const [page] = await getClient().getContentByPath(url, {
    ...variationFilter,
    next: { revalidate: 3600, tags: ["page"] },
  } as any);

  // Render page normally - Graph returns the matched CMS variation,
  // or the original page when no variation key was resolved.
}`;

const ODP_EVENTS_SNIPPET = `// Two ways an event leaves this app. Only the first is ODP-only.
//
// 1. Straight to ODP - never reaches experiment results
//    window.zaius.event("pageview")            <- identity component, per route
//    window.zaius.entity("customer", {...})    <- identity stitching + top_category
//
// 2. One call, three destinations - NOT "the FX SDK"
//    trackEvent("scroll_depth", {...})         <- the tracking listener
//      -> FX:        user.trackEvent(key, tags)        experiment metrics
//      -> ODP:       zaius.event(key, {...tags})       moves segment membership
//      -> dataLayer: window.dataLayer.push({...})      GA4 / GTM
//
//    Every one of those carries exp_variant_string, so the variation the
//    visitor was served travels with the event to all three.
//
// Decision events are separate again: user.decide("flag", []) on render.
// Everything keys off the same visitor ID (optimizelyEndUserId) - which is
// exactly why the identity component stitches it into ODP as fs_user_id.`;

export default async function OdpDemoPage() {
  const { userId } = await getVisitorContext();

  const odpSegments = await queryOdpSegments(userId);
  const odpVariationKey = resolveVariationKey(odpSegments);
  const odpConfigured = !!process.env.OPTIMIZELY_ODP_API_KEY;
  const mappingEntries = Object.entries(ODP_SEGMENT_TO_VARIATION);

  return (
    <>
      <DemoHero
        title="Optimizely Data Platform"
        description="ODP is the data layer: it builds a behavioural profile per visitor from cross-session events and computes segment membership. It has no delivery role of its own, which means it can drive Graph directly - the shortest path to personalized CMS content, with no experiment engine in the loop."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ Direct to Graph, no FX required
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ Behavioural, cross-session audiences
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Also plugs into FX and WX
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Why the direct path is the primary one here, and where the other two are documented */}
        <section id="odp-direct-first">
          <DemoSectionHeading id="odp-direct-first">The Direct Path Is the Main One{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            ODP answers one question - <em>who is this visitor, based on everything they have ever
            done</em> - and it answers it server-side, before the response. That makes it unusually
            well suited to CMS personalization: query the visitor&apos;s segments, map one to a
            variation key, hand the key to Graph. Nothing buckets, nothing splits traffic, and
            nothing needs to be measured, because this is personalization rather than an experiment.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            ODP is also an audience <em>source</em> for the other two products, and those are
            documented on their own pages. Reach for them when you need what they add - statistics,
            or a marketer-owned visual editor - not to get at ODP data.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5">
              <p className="text-[10px] font-mono text-brand uppercase tracking-wider mb-2">Direct · this page</p>
              <p className="font-display font-semibold text-on-surface text-sm mb-1">ODP → Graph</p>
              <p className="text-xs text-on-surface-variant">
                Segments queried server-side, mapped to a variation key, served in the first
                response. No experiment, no flicker, no extra request.
              </p>
            </div>
            <Link
              href="/demo/feature-experimentation#targeting-sources"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">As an FX audience</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                ODP → FX → Graph
              </p>
              <p className="text-xs text-on-surface-variant">
                Use an ODP segment as an FX audience condition when you want the decision measured.
                Adds statistics; costs a bucketing step.
              </p>
            </Link>
            <Link
              href="/demo/web-experimentation#wx-odp"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-2">As a WX attribute</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                ODP → WX → CMS
              </p>
              <p className="text-xs text-on-surface-variant">
                Push the segment in as a WX user attribute so a marketer can target it from the
                visual editor with no deploy.
              </p>
            </Link>
          </div>
        </section>

        {/* Section D - ODP as the behavioral layer for deeper targeting */}
        <section id="odp-personalization">
          <DemoSectionHeading id="odp-personalization">ODP: The Behavioral Layer for Deeper Targeting{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            ODP is a behavioral profile store - it remembers what a visitor did over time. You can
            use it in two ways: reference an ODP segment as an{" "}
            <Link href="/demo/feature-experimentation#audience-targeting" className="text-brand hover:underline">FX audience</Link>{" "}
            (decision still runs through FX, with experiments and statistical results), or skip FX entirely -
            query ODP directly, map a segment name to a CMS variation key, and pass it straight to Graph.
            For how ODP builds profiles (identity stitching, events, segments) and the full
            direct-path Server Component, see{" "}
            <a href="#odp" className="text-brand hover:underline">identity, events &amp; segments</a> below.
          </p>

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
            feed the same Graph variation filter - only the decision layer differs.
          </Callout>
        </section>

        {/* How ODP builds the profiles: identity, events, segments, direct path */}
        <section id="odp">
          <DemoSectionHeading id="odp">ODP: identity, events &amp; segments{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The segments above don&apos;t appear by magic - ODP (Optimizely Data Platform) builds a
            behavioral profile per visitor from events the browser sends, then evaluates segment
            membership in real time. Four things flow through it: an event tag in the page{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">head</code>, identity
            stitching that links ODP&apos;s cookie to the FX visitor ID, a server-side query that
            reads segment membership back out, and customer-attribute writes that put{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">top_category</code> and{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">last_category</code> on
            the profile. That last one is what lets a marketer build an audience on a CMS taxonomy
            term from a dropdown instead of filing an engineering ticket. Once you have a segment,
            the direct path maps it to a CMS variation and passes it straight to Graph - no FX
            engine required.
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">The ODP tag</h3>
              <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
                The browser sends events (pageviews, identity) through the ODP tag. It is inlined in the
                root layout&apos;s <code className="bg-surface-low px-1 rounded font-mono text-xs">head</code>{" "}
                so the <code className="bg-surface-low px-1 rounded font-mono text-xs">zaius</code> command
                queue exists synchronously - events fired before the async script loads are queued and
                replayed.
              </p>
              <CodeBlock code={ODP_TAG_SNIPPET} label="The ODP tag (inlined in the root layout head)" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">Identity stitching</h3>
              <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
                ODP tracks browsers by its own <code className="bg-surface-low px-1 rounded font-mono text-xs">vuid</code>{" "}
                cookie, but everything else in this app keys off{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code>{" "}
                (set by middleware, used by Feature Experimentation). Linking the two once via the{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">fs_user_id</code> identifier
                is what lets the server ask ODP about the same visitor the FX SDK is bucketing.
              </p>
              <CodeBlock code={ODP_IDENTITY_SNIPPET} label="Stitching the visitor id into ODP" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">Server-side segment queries</h3>
              <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
                ODP exposes a GraphQL API for profile data. The app asks one narrow question per request:
                of the segments this app cares about, which does the visitor qualify for? The subset filter
                keeps the query cheap, the 300s cache keeps it off the hot path, and any failure returns an
                empty array - personalization degrades to the default content, never to an error page.
                Surfaces that have to show current state rather than cached state, like the audience
                switcher panel, ask for{" "}
                a profile endpoint with a cache-bypass flag,
                which bypasses that cache.
              </p>
              <CodeBlock code={ODP_SEGMENT_QUERY_SNIPPET} label="src/lib/optimizely/odp.ts" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">Direct path: ODP segments to CMS variants</h3>
              <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
                No FX engine in the loop. Query the visitor&apos;s segments, map one to a CMS variation
                key, pass that key straight to Graph - which returns the matching variant, or the original
                page if nothing matches. Use this when personalizing for known behavioral segments with no
                experiment to run; reach for the{" "}
                <Link href="/demo/feature-experimentation" className="text-brand hover:underline">FX path</Link>{" "}
                when you need traffic splits, hold-out groups, or significance testing (it runs the identical
                Graph variation filter, just behind the FX decision engine).
              </p>
              <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5 mb-4">
                <p className="text-[10px] font-mono text-brand uppercase tracking-wider mb-3">ODP direct pipeline</p>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "Segment lookup", sub: "subset filtered, cached" },
                    { label: "Resolve variation", sub: "first matching segment wins" },
                    { label: "Graph variation filter", sub: "getContentByPath({ variation })" },
                    { label: "CMS variant", sub: "or original fallback", highlight: true },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className={`text-center rounded-xl px-4 py-3 min-w-[150px] ${step.highlight ? "bg-brand/10 border border-brand/30" : "bg-surface-low"}`}>
                        <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
                      </div>
                      {i < arr.length - 1 && <span className="text-on-surface-variant text-lg">→</span>}
                    </div>
                  ))}
                </div>
              </div>
              <CodeBlock code={ODP_DIRECT_PATH_SNIPPET} label="Complete Server Component - copy and adapt" />
            </div>

            <div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">ODP events vs FX events</h3>
              <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
                There are two ways an event leaves this app, and the difference is narrower than it
                looks. Pageviews are ODP-only: the identity component{" "}
                calls the zaius tag directly, so a pageview feeds the behavioral profile and never
                appears in experiment results. Everything else goes through one{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">trackEvent()</code>{" "}
                call that fans out to <strong className="text-on-surface">all three</strong>{" "}
                destinations - FX, ODP and the dataLayer. So a conversion does move segment
                membership: the same call that records an experiment metric also lands on the ODP
                profile a segment is computed from. Each of those events now also carries{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">exp_variant_string</code>,
                so the variation the visitor saw travels with it. For the fan-out itself, see{" "}
                <Link href="/demo/event-tracking" className="text-brand hover:underline">Event Tracking</Link>.
              </p>
              <CodeBlock code={ODP_EVENTS_SNIPPET} label="Two pipelines, one visitor ID" />
            </div>
          </div>
        </section>

        {/* Audience Switcher */}
        <section id="audience-switcher">
          <DemoSectionHeading id="audience-switcher">Demo: Settings Panel{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The floating pill in the bottom-right corner lets a presenter instantly switch
            between audience segments without waiting for FX bucketing - useful for showing
            clients exactly which content each segment sees. It also carries the{" "}
            <strong>WX delivery</strong> switch described above, and reports which CMS
            variation the Web Experimentation bridge resolved on the current page.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6">
              <h3 className="font-display font-semibold text-on-surface mb-3">What it sets</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                The switcher writes two cookies that{" "}
                the request-scoped visitor context{" "}
                picks up on every subsequent server request. These map directly to FX audience conditions
                - no client-side SDK involved. The{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">bucketing_id</code>{" "}
                cookie also serves as the FX bucketing ID, keeping the visitor in the same traffic
                bucket across page loads.
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-mono text-on-surface-variant uppercase tracking-wider mb-2">Persona</p>
                  <div className="space-y-1.5">
                    {[
                      { key: "new_visitor", note: "persona absent (default)" },
                      { key: "personal", note: 'persona = "personal"' },
                      { key: "business", note: 'persona = "business"' },
                      { key: "mortgages", note: 'persona = "mortgages"' },
                      { key: "investments", note: 'persona = "investments"' },
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
                      { label: "Guest", note: "bucketing_id absent" },
                      { label: "Logged In", note: "bucketing_id = [hash]" },
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
              <CodeBlock code={`// Audience Switcher writes two cookies.
// Persona: POST /api/demo/set-persona → persona (1-day)
// Logged In: POST /api/demo/set-bucketing-id → bucketing_id
//   Value: SHA-256 of "demo-account@mosey.bank" (stable hash)

// visitor.ts reads both on every server request:
const persona     = cookieStore.get("persona")?.value;
const bucketingId = cookieStore.get("bucketing_id")?.value;

// bucketing_id serves two roles:
//   1. logged_in: !!bucketingId  (the FX attribute)
//   2. passed to createUserContext() as bucketingId
//      for stable cross-device traffic bucketing in FX

// FX attribute map produced:
// { device: "desktop", persona: "personal", logged_in: true }
// FX audience conditions:
//   persona == "personal"  → variation key: "personal"
//   persona == "business"  → variation key: "business"
//   logged_in == true      → your custom audience`} />
            </div>
          </div>

          <Callout variant="warning">
            <strong>The Audience Switcher is demo tooling only.</strong>{" "}
            In production, replace the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code> cookie
            with real audience signals - auth session data, CRM enrichment, or onboarding answers.
            The FX audience conditions and targeting logic stay the same; only the attribute source changes.
          </Callout>
        </section>

        <SourcePanel
          heading="How this reference implementation does it"
          files={[
            {
              label: "odp.ts",
              path: "src/lib/optimizely/odp.ts",
              content: odpTs,
            },
            {
              label: "OdpSetup.tsx",
              path: "src/components/OdpSetup.tsx",
              content: odpSetupTsx,
            },
            {
              label: "experimentationOdp.ts",
              path: "src/lib/optimizely/experimentationOdp.ts",
              content: experimentationOdpTs,
            },
          ]}
        />

      </div>
    </>
  );
}
