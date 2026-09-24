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
import { StepBadge } from "@/components/ui/StepBadge";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";

export const dynamic = "force-dynamic";

const visitorTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/visitor.ts"),
  "utf8"
);
const odpTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/odp.ts"),
  "utf8"
);
const odpSetupTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/OdpSetup.tsx"),
  "utf8"
);
const profileTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/profile.ts"),
  "utf8"
);
const wxProfileBridgeTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/personalization/WxProfileBridge.tsx"),
  "utf8"
);
const experimentationOdpTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/experimentationOdp.ts"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Personalization & Audiences",
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
      <StepBadge size="xl">{number}</StepBadge>
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
            matches ? "bg-brand/10 text-brand" : "bg-surface-low text-on-surface-variant"
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
  const pageViews = attributes.page_views as number | undefined;

  const odpSegments = await queryOdpSegments(userId);
  const odpVariationKey = resolveVariationKey(odpSegments);
  const odpConfigured = !!process.env.OPTIMIZELY_ODP_API_KEY;
  const mappingEntries = Object.entries(ODP_SEGMENT_TO_VARIATION);

  return (
    <>
      <DemoHero
        title="Personalization & Audiences"
        description="Four paths to personalized CMS content - from the full Optimizely stack (FX + ODP) down to bringing your own audience logic entirely. All server-side paths feed the same Graph variation filter."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ FX: delivery engine + experiment results
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ ODP: audience layer, works with or without FX
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            FX + ODP combination supported
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

        {/* Page-level intro */}
        <div className="max-w-3xl space-y-3">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Optimizely has several products that all touch personalization - FX, ODP, Web Experimentation,
            and the CMS each have their own audience system and their own way of showing different content
            to different visitors. That overlap is real and intentional, but it can make it hard to know
            which to reach for, or whether to combine them.
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            The clearest way to think about it is in <strong className="text-on-surface">layers</strong>, not alternatives:{" "}
            ODP is the data layer (who is this visitor, based on their history);
            FX is the decision layer (which variant should they see, and can we measure lift);
            Optimizely Graph is always the delivery layer (it serves the right CMS variant once it has a variation key).
            The four paths below are different ways of stacking those layers - from the full Optimizely stack down to
            bringing your own logic entirely.
          </p>
        </div>

        {/* Section A - three paths to personalized content */}
        <section id="how-it-works">
          <DemoSectionHeading id="how-it-works">Four Paths to Personalized Content{" "}</DemoSectionHeading>
          <ul className="text-sm text-on-surface-variant mb-8 max-w-3xl space-y-2">
            <li><strong className="text-on-surface">Feature Experimentation (FX)</strong> - delivery engine: configures audiences, buckets traffic, runs A/B experiments, and produces statistical results. Managed in your source code, so the decision can run at the <strong className="text-on-surface">edge / server-side</strong> or <strong className="text-on-surface">client-side</strong> via an SDK.</li>
            <li><strong className="text-on-surface">ODP (Optimizely Data Platform)</strong> - audience layer only: builds behavioral profiles from cross-session events. No delivery role - plugs into FX as an audience source, or drives Graph directly.</li>
            <li><strong className="text-on-surface">Optimizely Graph</strong> - content delivery API: always the final step, regardless of which path resolves the variation key. Serves the right CMS variant based on the key it receives.</li>
            <li><strong className="text-on-surface">Web Experimentation / Personalization</strong> - a separate, standalone Optimizely product with its own visual editor and its own <strong className="text-on-surface">client-side</strong> delivery: it buckets visitors and applies changes in the browser, independent of the CMS and Graph. It <em>can</em> be bridged to CMS content as a last resort, but the server-side paths above are simpler and have no lag.</li>
            <li className="text-on-surface-variant/70">FX and ODP can be combined - ODP segments used as FX audience conditions. Path 3 is the escape hatch for bringing your own audience logic entirely.</li>
          </ul>

          {/* Triple pipeline */}
          <div className="space-y-3 mb-8">
            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5">
              <p className="text-[10px] font-mono text-brand uppercase tracking-wider mb-3">Path 1 - Feature Experimentation (server-side, CMS-integrated)</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {[
                  { label: "Audience signal", sub: "device, persona, geo, auth" },
                  { label: "FX engine", sub: "delivery, experiments, results" },
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
              <p className="text-xs text-on-surface-variant leading-relaxed">
                FX is the delivery engine: it evaluates audience rules in-process, buckets traffic,
                and returns a variation key that Graph uses to serve the right CMS variant. The FX
                results page tracks decision events and conversions per variation and runs a{" "}
                <strong className="text-on-surface">statistical significance test</strong> - you can declare
                a winner with a measured confidence interval. FX audience conditions can be fed from
                native request-time attributes <em>or</em> ODP segments (the combination) - see FX Audience
                Sources below. Use this path when you need experiments, hold-out groups, or measurable lift.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-3">Path 2 - ODP direct (server-side, no Feature Experimentation)</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {[
                  { label: "ODP segments API", sub: "one query per request" },
                  { label: "Segment map", sub: "segment name → variationKey" },
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
              <p className="text-xs text-on-surface-variant leading-relaxed">
                ODP is an <strong className="text-on-surface">audience layer only</strong> - it has no delivery
                role. Query it for the visitor&apos;s behavioral segments, map a segment name to a variation
                key, and pass it straight to Graph. CMS/Graph still does the content delivery, just as
                in Path 1 - only the decision layer differs. ODP reporting covers{" "}
                <strong className="text-on-surface">audience analytics</strong> (segment reach, engagement
                trends) - not a controlled statistical test. Use this path for pure personalization for
                known behavioral segments with no experiment to run.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-3">Path 3 - Custom audience layer (server-side, direct to Graph)</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {[
                  { label: "Custom logic", sub: "cookie, DB, API, 3rd-party service" },
                  { label: "Variation key", sub: "resolved by your code" },
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
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Graph&apos;s variation filter accepts any string as the variation key - it does not care
                where it came from. Plug in whatever audience system you already have: read a cookie
                your own system wrote, call an internal API, query a database, or derive the key from
                request headers. Resolve the key in your Server Component and pass it to{" "}
                <code className="bg-surface-low px-1 rounded font-mono">getContentByPath(url, {`{ variation: { include: "SOME", value: [key], includeOriginal: true } }`})</code>.
                The rest of the delivery pipeline - Graph filter, CMS variant, original fallback - works
                identically to Paths 1 and 2.
              </p>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-3">Path 4 - Web Experimentation / Personalization (separate, standalone product)</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Unlike Paths 1-3, this is not a server-side route to CMS content - it is a{" "}
                <strong className="text-on-surface">separate, standalone Optimizely product</strong> with its own
                visual editor and its own client-side delivery. It buckets visitors and applies changes in the
                browser, independent of the CMS and Graph, and tracks its own results. It <em>can</em> be bridged
                to serve CMS content, but only as a <strong className="text-on-surface">last resort</strong> - a
                cookie with a one-request lag, or a client-side refetch with a flicker; the server-side paths
                above are simpler and have no lag.{" "}
                <a href="#web-experimentation-bridge" className="text-brand hover:underline">See the fallback bridge below.</a>
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <Callout variant="note">
              <strong>FX and ODP are not mutually exclusive.</strong>{" "}
              ODP segments can be used as FX audience conditions - the decision still runs through
              FX&apos;s delivery engine (bucketing, experiments, statistical results), but the audience
              condition references a behavioral segment rather than a request-time attribute. This
              is the combination: ODP depth with FX infrastructure. It is covered in the{" "}
              <a href="#targeting-sources" className="text-brand hover:underline">FX Audience Sources</a>{" "}
              section below.
            </Callout>

            <Callout variant="note">
              <strong>Coming from CMS12/13 Visitor Groups / Audiences?</strong>{" "}
              In Optimizely CMS12/13 (.NET), this feature was called Visitor Groups and later renamed
              to Audiences. Criteria are defined in the CMS admin UI and evaluated server-side
              in-process at request time via <code className="bg-surface-low px-1 rounded font-mono text-xs">IsMatch()</code>.
              Content blocks show or hide at the component level based on audience membership.
              No separate SDK - purely rules-based, built into the CMS, no A/B testing or statistical results.{" "}
              <strong>In the SaaS CMS (this demo), Visitor Groups / Audiences do not exist</strong> - the CMS
              is headless with no built-in rendering layer. Personalization is externalized:
              FX audience rules take the place of criteria for request-time facts (device, country, login state);
              ODP segments take the place of behavioral criteria (page view history, high-value, churn risk).
              FX also adds what Visitor Groups never had: experiments, traffic splits, and statistical results.
            </Callout>
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
            <a
              href="#odp"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">ODP Guide</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                ODP: Profiles and Segments
              </p>
              <p className="text-xs text-on-surface-variant">
                How ODP builds visitor profiles, ingests events, and computes segments
              </p>
            </a>
          </div>
        </section>

        {/* Section B - the two sources for FX audiences */}
        <section id="targeting-sources">
          <DemoSectionHeading id="targeting-sources">FX Audience Sources: Native Attributes vs ODP Segments{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            ODP is an audience layer, not a delivery engine - it plugs into FX&apos;s audience
            configuration to provide behavioral depth. Within the FX path, an audience condition
            can be fed from two sources: native request-time attributes already in your app, or
            ODP segments computed from cross-session behavior. Both resolve to the same variation
            key and run through the same FX delivery engine - they differ in what they can express
            and what they cost.
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
                collected once per request and passed
                straight into <code className="bg-surface-low px-1 rounded font-mono text-xs">userCtx.decide()</code>. The SDK matches
                them against your audience rules <strong>locally, in-process</strong> - no extra service, no network round-trip.
              </p>
              <div className="space-y-1.5 text-xs pt-2 border-t border-ghost-border">
                <div className="flex gap-2"><span className="text-brand font-bold shrink-0">+</span><span className="text-on-surface-variant">Zero network calls - evaluated in the same request</span></div>
                <div className="flex gap-2"><span className="text-brand font-bold shrink-0">+</span><span className="text-on-surface-variant">One-file setup: add to visitor.ts, define the FX condition</span></div>
                <div className="flex gap-2"><span className="text-error font-bold shrink-0">-</span><span className="text-on-surface-variant">Only sees this request - no memory of past behavior</span></div>
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
                <div className="flex gap-2"><span className="text-brand font-bold shrink-0">+</span><span className="text-on-surface-variant">Remembers behavior across sessions and devices</span></div>
                <div className="flex gap-2"><span className="text-brand font-bold shrink-0">+</span><span className="text-on-surface-variant">Rich segments from events, not just request facts</span></div>
                <div className="flex gap-2"><span className="text-error font-bold shrink-0">-</span><span className="text-on-surface-variant">Network call + latency; needs event instrumentation and an ODP account</span></div>
              </div>
            </div>
          </div>

          <Callout variant="note">
            <strong>Both FX audience sources resolve to the same variation key</strong> and run the identical{" "}
            <Link href="/demo/feature-experimentation#how-it-works" className="text-brand hover:underline">FX → Graph → CMS pipeline</Link>.
            ODP simply adds a behavioral data layer <em>before</em> the FX decision. For a path that bypasses
            FX entirely, see the ODP direct section below.
          </Callout>
        </section>

        {/* Audience attributes */}
        <section id="audience-attributes">
          <DemoSectionHeading id="audience-attributes">FX Native Attributes in Depth{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            The native path in detail. FX audiences are matched against the attributes you return from{" "}
            the request-scoped visitor context,
            all evaluated in-process - headers, cookies, auth sessions, geo data, and any database
            value are available before HTML is streamed, with no network call to a separate service.
            Below are practical patterns for the most common attribute sources.
          </p>

          <div className="space-y-8">

            {/* 1 - Device / UA */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <StepBadge>1</StepBadge>
                <h3 className="font-display font-semibold text-on-surface">Device &amp; User-Agent</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium shrink-0">already live</span>
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

// Pass as part of attributes to createUserContext(userId, { device, ... })
// FX audience condition: device = "mobile"`} />
              </div>
            </div>

            {/* 2 - Persona / audience switcher */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <StepBadge>2</StepBadge>
                <h3 className="font-display font-semibold text-on-surface">Persona</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium shrink-0">already live</span>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    The Audience Switcher sets a{" "}
                    <code className="bg-surface-low px-1 rounded font-mono text-xs">persona</code>{" "}
                    cookie. The request-scoped visitor context{" "}
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
const persona = cookieStore.get("persona")?.value;

// In production: replace cookie with real enrichment
// e.g. from your CRM or database:
// const persona = await getUserSegment(userId);

// FX audience conditions:
//   persona = "personal"
//   persona = "business"
//   persona = "mortgages"
//   persona = "investments"`} />
              </div>
            </div>

            {/* 3 - Auth / logged-in state */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <StepBadge>3</StepBadge>
                <h3 className="font-display font-semibold text-on-surface">Auth session</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium shrink-0">already live</span>
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

const session = await getServerSession();
// Use the account ID as userId for stable cross-device bucketing
const userId = session?.user?.id ?? cookieId;

const userCtx = client.createUserContext(userId, {
  ...attributes,
  logged_in: Boolean(session),
  plan:      session?.user?.plan ?? "free",
  role:      session?.user?.role ?? "guest",
});
const decision = userCtx.decide("premium_feature", [DISABLE_DECISION_EVENT]);
// FX audiences:
//   logged_in = true
//   plan = "premium"
//   role = "admin"`} />
              </div>
            </div>

            {/* 4 - Geo */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <StepBadge>4</StepBadge>
                <h3 className="font-display font-semibold text-on-surface">Geo / Country (request headers)</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                    Vercel, Cloudflare, and most edge runtimes inject geo headers on every request.
                    Add them to{" "}
                    the request-scoped visitor context{" "}
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
                <StepBadge>5</StepBadge>
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
  const userCtx = client.createUserContext(userId, {
    ...attributes,
    utm_source:   sp.utm_source ?? "direct",
    utm_medium:   sp.utm_medium ?? "none",
    utm_campaign: sp.utm_campaign ?? "none",
  });

  const decision = userCtx.decide("campaign_hero", [DISABLE_DECISION_EVENT]);
  // FX audience: utm_source = "google"
}`} />
              </div>
            </div>

            {/* 6 - Combining attributes */}
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-ghost-border flex items-center gap-3">
                <StepBadge>6</StepBadge>
                <h3 className="font-display font-semibold text-on-surface">Combining attributes - audience conditions in FX</h3>
              </div>
              <div className="p-6 grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    All attributes are available as AND/OR/NOT conditions in the FX dashboard.
                    The SDK evaluates them locally against the attribute map - no network call per decision.
                  </p>
                </div>
                <CodeBlock code={`// All attributes are set once when creating the user context
const userCtx = client.createUserContext(userId, {
  // Base attributes (device, persona, logged_in) from the visitor context
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
const decision = userCtx.decide("homepage", [DISABLE_DECISION_EVENT]);
// FX evaluates ALL of these server-side.
// Zero client-side data exposure.`} />
              </div>
            </div>

          </div>
        </section>

        {/* Extending the visitor context */}
        <section id="extending-visitor-context">
          <DemoSectionHeading id="extending-visitor-context">Extending the Visitor Context{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Adding a new audience signal is a one-file change. Once an attribute flows into{" "}
            the request-scoped visitor context,
            it becomes available as an FX audience condition with no further SDK configuration.
          </p>

          <div className="space-y-6 max-w-2xl">
            <Step number={1} title="Add the signal where visitor context is resolved">
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

            <Step number={5} title="Validate on the Experimentation page">
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

        {/* Web Experimentation bridge */}
        <section id="web-experimentation-bridge">
          <DemoSectionHeading id="web-experimentation-bridge">Web Experimentation → CMS Content, on the First Pageview{" "}</DemoSectionHeading>

          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Teams that already run Web Experimentation and then adopt a headless CMS almost always hit the
            same question: how do I make my WX experiments and personalization serve content from the CMS
            content model? There are three ways to get a WX-style change onto the page. Two of them decide
            on the server; the third keeps WX as the decisioning engine and is what the rest of this
            section covers.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The ordering is what makes it work. WX decides <strong>in the browser</strong>, after the
            server has rendered and sent the page - so it cannot influence that response. But the WX
            snippet is a <strong>blocking script in the document head</strong>, which means its decision
            exists <strong>before the browser parses the body or paints anything</strong>. That is the
            opening: the page can read a decision WX has already made, synchronously, with no network
            call and nothing stored.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            An earlier version of this bridge passed the decision through a cookie, which meant it could
            only act on the visitor&apos;s <em>second</em> request. Nothing about the integration required
            that, and the cookie is gone. The cost has moved rather than disappeared, though, and it is
            spelled out at the end of the section.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Author it in Web Experimentation</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Build the change in WX&apos;s own visual editor; the snippet mutates the page in the browser,
                with no CMS or Graph involvement. Its real advantage is reach - it can change <em>anything</em>{" "}
                on the rendered page, even edits nobody modeled in the CMS, without waiting on a developer. The
                tradeoff: the content does not live in your CMS, so if you only need changes the CMS already
                supports, the server-side paths are cleaner.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">no CMS needed</span>
            </div>

            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Decide server-side, serve CMS content</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                When the content must come from the CMS - so editors own it and it is server-rendered and
                cached - make the decision <em>before</em> the HTML is sent.{" "}
                <Link href="/demo/feature-experimentation" className="text-brand hover:underline">Feature Experimentation</Link>{" "}
                for experiments; the{" "}
                <Link href="#how-it-works" className="text-brand hover:underline">ODP-direct / custom paths (Paths 1-3)</Link>{" "}
                for personalization. The variant is in the first response - no lag, no flicker.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">recommended</span>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Bridge WX to the CMS</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                For when you must keep <strong>WX as the decisioning engine</strong> <em>and</em> the
                content must come from the <strong>CMS content model</strong>. The page reads the decision
                WX already made before first paint and routes the render to the matching CMS variation, so
                it applies on the first pageview with nothing written to storage. The cost is that the
                affected region is held for one cached request while the variation arrives.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">no cookie, first view</span>
            </div>
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mt-8 mb-2">
            How the bridge works
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            A CMS variation whose name begins with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code>{" "}
            opts its page into the bridge. That prefix is doing three jobs at once: it is the allowlist
            that stops a made-up name reaching Graph, it is the per-page opt-in (a page with no{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code> variation emits no
            extra markup and pays nothing), and it keeps WX clear of the unprefixed names, which are
            reserved for matching Feature Experimentation variation keys.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            On a page that has opted in, the server sends a short inline script and wraps the content in a
            holdable region. The script reads{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">getExperimentStates</code>{" "}
            synchronously, intersects the variation names WX bucketed this visitor into with the names the
            page actually has, and on a match hides the region and hands the name to a client component,
            which soft-navigates to the variation route. Because the base response is identical for every
            visitor, it stays a single cached entry - the buckets do not fragment the cache.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Identity is already shared:{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code>{" "}
            is written domain-wide by middleware and is the same identifier the Web snippet uses. Both
            products see the same visitor with no extra coordination needed.
          </p>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Sharing a visitor ID is not the same as sharing what you know about that visitor, though,
            and the traffic above only runs one way - out of WX and into the server. The return leg is{" "}
            a small client component,
            which pushes the shared profile in as WX user attributes: persona, ODP segment, top
            category and the variation that was served. That is what lets a marketer target a WX
            experiment at a CMS taxonomy term or an ODP audience from the WX UI, with no deploy.
            Be aware of the timing - WX evaluates audiences at page activation and this push lands
            after hydration, so the attributes apply from the <strong>next</strong> activation, the
            same one-request lag as the persisted decision.
          </p>

          {/* Single-request architecture diagram */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-8">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-4">One pageview, no storage</p>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-wider mb-2">Head - blocking, before any paint</p>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "WX snippet runs", sub: "decision now in memory" },
                    { label: "Inline script reads", sub: "getExperimentStates()" },
                    { label: "Region held", sub: "matched name only" },
                  ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className="text-center rounded-xl px-4 py-3 min-w-[130px] bg-surface-low">
                        <p className="text-xs font-mono font-semibold text-on-surface">{step.label}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant mt-1">{step.sub}</p>
                      </div>
                      {i < arr.length - 1 && <span className="text-on-surface-variant text-lg">→</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-ghost-border" />
              <div>
                <p className="text-[10px] font-mono text-on-surface-variant/60 uppercase tracking-wider mb-2">Same pageview - variation swapped in</p>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { label: "Hydration", sub: "reads the matched name" },
                    { label: "Soft navigation", sub: "/__v_wx--wx_name" },
                    { label: "Graph filter", sub: "variation: { include: SOME }" },
                    { label: "CMS variant", sub: "region revealed", highlight: true },
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
            </div>
            <p className="text-[10px] font-mono text-on-surface-variant/60 mt-4">
              A visitor in no matching experiment never sets the attribute, so nothing is held and the base
              response paints as normal.
            </p>
          </div>

          {/* Step 1 + 2 */}
          <div className="space-y-6 max-w-2xl mb-6">
            <Step number={1} title="Create the CMS variation in Visual Builder">
              In the CMS, open the page you want to experiment on and click{" "}
              <strong>Add variation</strong>. Name it with the{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code> prefix - for
              example <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_treatment</code>.
              Edit the variation&apos;s composition and publish it. Variations can only be{" "}
              <em>created</em> in the Visual Builder UI; no REST path creates one.
            </Step>

            <Step number={2} title="Name the WX variation identically">
              In the Web Experimentation UI, name the experiment&apos;s variation exactly the same string,{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_treatment</code>,
              case-sensitive. That is the entire WX-side configuration: <strong>no Custom JS action</strong>,
              no cookie, no snippet edit. Leave the control variation named anything that is not a CMS
              variation name and it falls through to base content, which Graph&apos;s{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">includeOriginal: true</code>{" "}
              guarantees. If the visitor is in the experiment&apos;s <strong>holdback</strong>, they also
              get base content - the bridge checks that explicitly, because serving a holdback visitor the
              variation would corrupt the result.
            </Step>
          </div>

          {/* Code blocks - WX action + middleware */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">The pre-paint read (inline, before any paint)</span>
              </div>
              <CodeBlock code={`// Emitted by the page only when it has wx_* variations.
// Runs after the blocking WX snippet, so the decision is
// already in memory: no network, no storage, no callback.

var states = window.optimizely
  .get("state")
  .getExperimentStates({ isActive: true });

for (var id in states) {
  var s = states[id];
  // A holdback visitor is the control - they get base.
  // Only this shape exposes the flag; getVariationMap()
  // would report a bucket for them and skew the test.
  if (s.isInExperimentHoldback) continue;
  live[s.variation.name] = s.experimentName;
}

// NAMES is the page's own wx_* variation list, so an
// unknown name can never reach Graph. Iterating NAMES
// keeps the winner deterministic across experiments.
for (var i = 0; i < NAMES.length; i++) {
  if (live[NAMES[i]]) { hold(NAMES[i]); break; }
}`} />
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">WxVariationSwap.tsx (the swap)</span>
              </div>
              <CodeBlock code={`// Routes to the variation using the same URL shape
// middleware builds for FX, so the catch-all page needs
// no new Graph query - it already reads __v_ segments.

const hit = window.__optiWxCms.read();

if (hit) {
  // Attribution first: WX reports its own conversions,
  // but exp_variant_string on GA4 events comes from here.
  recordVariation(hit.e, hit.v);

  startTransition(() => {
    router.replace(
      pathname + "/__v_wx--" + hit.v,
      { scroll: false }
    );
  });
}

// The hold is released when the transition settles. A
// timer in the inline script is the backstop, so a page
// that never hydrates still reveals itself.`} />
            </div>
          </div>

          {/* Step 3 + 4 */}
          <div className="space-y-6 max-w-2xl mb-8">
            <Step number={3} title="Verify it without a live WX experiment">
              Two halves can be checked independently. For the server half, request the variation route
              directly -{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">/savings/__v_wx--wx_treatment</code>{" "}
              - and confirm it returns the variation rather than a 307. A name the CMS does not have is
              redirected away, so the same request with a made-up name is the negative test. For the
              browser half, open a page that has a{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code> variation and call{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">window.__optiWxCms.read()</code>{" "}
              in the console: it returns the matched name and experiment, or null when the visitor is in
              no matching bucket.
            </Step>

            <Step number={4} title="FX and Web Experimentation can coexist">
              FX and WX can run simultaneously on the same page, and FX wins: it decides on the server, so
              by the time the browser could read a WX decision the URL already carries an FX variation
              segment and the bridge stands down. The two never fight over the same render. A WX decision
              also deliberately fires <strong>no</strong> FX impression - there is no FX flag behind it,
              and recording one would put a phantom decision in FX&apos;s reporting.
            </Step>
          </div>

          <div className="space-y-3">
            <Callout variant="warning">
              <strong>The cost is now largest-contentful-paint, for bucketed visitors only.</strong>{" "}
              Holding the region means a visitor in a matching experiment waits one cached request before
              anything paints there, so their LCP is worse than if the server had decided. Nobody else pays
              it: a visitor in no matching experiment, one in the holdback, or anyone with the snippet
              blocked never sets the attribute and paints base content immediately. If you can move the
              decision to the server - FX, or the ODP-direct paths above - do that instead and the hold
              disappears entirely. This is the honest reason the server-side paths are still marked
              recommended.
            </Callout>

            <Callout variant="note">
              <strong>Some activation modes decide too late to hold.</strong>{" "}
              The synchronous read only works because the snippet is blocking and the page uses WX&apos;s
              default immediate activation. With polling, callback or manual activation, or an audience that
              needs a network call, the decision lands after first paint. The bridge still applies the
              variation in that case, but as a visible change rather than a held region, since holding
              speculatively would tax every visitor to help a few. Client-side navigation behaves the same
              way, for the same reason.
            </Callout>

            <Callout variant="note">
              <strong>Web Experimentation statistics are unaffected.</strong>{" "}
              WX tracks its own decision events and conversions via the snippet, and the bridge only changes
              which CMS content variant is served - all statistical analysis stays in the WX dashboard. The
              variation and its experiment name are also recorded into the shared variation map, so GA4
              events carry it in{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">exp_variant_string</code>{" "}
              alongside FX variations.
            </Callout>
          </div>
        </section>

        {/* Audience Switcher */}
        <section id="audience-switcher">
          <DemoSectionHeading id="audience-switcher">Demo: Audience Switcher{" "}</DemoSectionHeading>
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

        {/* Your session */}
        <section id="your-session">
          <DemoSectionHeading id="your-session">Your Session{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Live output from this reference implementation, not guidance - the attributes below were
            resolved for your actual request, and are what gets passed to Feature Experimentation as
            your audience attribute map on every page load. No round trip; it is evaluated entirely
            in-process. The useful thing to take from it is the <em>shape</em>: a small, stable set
            of attributes resolved once per request and reused by every decision.
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
                {pageViews !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-on-surface-variant uppercase tracking-wider">
                      page_views
                    </span>
                    <code className="text-sm font-mono text-on-surface">{pageViews}</code>
                  </div>
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
                  condition='persona = "mortgages"'
                  value={demoPersona ?? "not set"}
                  matches={demoPersona === "mortgages"}
                />
                <MatchRow
                  condition='persona = "investments"'
                  value={demoPersona ?? "not set"}
                  matches={demoPersona === "investments"}
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
                See your live flag decisions on the Experimentation page
              </p>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The Experimentation demo shows which flags are enabled for your session,
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

        <SourcePanel
          heading="How this reference implementation does it"
          files={[
            {
              label: "visitor.ts",
              path: "src/lib/optimizely/visitor.ts",
              content: visitorTs,
            },
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
              label: "profile.ts",
              path: "src/lib/optimizely/profile.ts",
              content: profileTs,
            },
            {
              label: "WxProfileBridge.tsx",
              path: "src/components/personalization/WxProfileBridge.tsx",
              content: wxProfileBridgeTsx,
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
