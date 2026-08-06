import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";

export const dynamic = "force-dynamic";

const odpTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/odp.ts"),
  "utf8"
);
const odpSetupTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/OdpSetup.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Optimizely Data Platform (ODP)",
};

const TAG_SNIPPET = `// src/app/layout.tsx - the ODP tag is inlined in <head> so the zaius
// command queue exists synchronously during HTML parsing. Events fired
// before the async script loads are queued and replayed.

var zaius = window['zaius'] || (window['zaius'] = []);
zaius.methods = ['initialize','onload','customer','entity','event', /* ... */];
// ...queue shim...
e.src = 'https://d1igp3oop3iho5.cloudfront.net/v2/' +
        NEXT_PUBLIC_OPTIMIZELY_ODP_TRACKER_ID + '/zaius-min.js';`;

const IDENTITY_SNIPPET = `// src/components/OdpSetup.tsx ("use client", rendered in the root layout)
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

const SEGMENT_QUERY_SNIPPET = `// src/lib/optimizely/odp.ts - server-side segment membership query.
// Auth is the ODP API key in an x-api-key header (server-only env var).

const SEGMENT_QUERY = \`
  query GetSegments($userId: String!, $segmentFilter: [String!]!) {
    customer(vuid: $userId) {
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

const MAPPING_SNIPPET = `// src/lib/optimizely/odp.ts
//
// The explicit contract between ODP segment names and CMS variation names.
// This is the only place to update when either side renames something.

export const ODP_SEGMENT_TO_VARIATION: Record<string, string> = {
  // "high-value-customers": "business",
  // "retail-consumer":      "personal",
};

export function resolveVariationKey(segments: string[]): string | undefined {
  for (const segment of segments) {
    const key = ODP_SEGMENT_TO_VARIATION[segment];
    if (key) return key;
  }
}

// Usage - see the Direct Path to CMS Variants section below:
// queryOdpSegments(userId) → resolveVariationKey(segments) →
// getContentByPath(url, { variation: { include: "SOME", value: [key],
//   includeOriginal: true } })
// includeOriginal: true means the original page is served when no key matches.`;

const DIRECT_PATH_SNIPPET = `// Any Server Component - the complete ODP direct → Graph pipeline.
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

const EVENTS_SNIPPET = `// Two event pipelines run side by side in this app - don't conflate them:
//
// 1. ODP events (behavioral profile, segments, campaigns)
//    window.zaius.event("pageview")            <- OdpSetup, per route change
//    window.zaius.entity("customer", {...})    <- identity stitching
//
// 2. FX events (experiment metrics and impressions)
//    trackEvent("mb_scroll_depth", {...})      <- AutoTracker via the FX SDK
//    user.decide("flag", [])                    <- impression on render
//
// ODP events build the profile that segments are computed from.
// FX events power experiment results. Both key off the same visitor ID
// (optimizelyEndUserId) - which is exactly why OdpSetup links the IDs.`;

export default function OdpDemoPage() {
  return (
    <>
      <DemoHero
        title="Optimizely Data Platform (ODP)"
        description={<>ODP is Optimizely&apos;s customer data platform: it builds a behavioral profile per
            visitor and computes real-time segment membership. This app uses it for identity
            stitching, event collection, and server-side segment queries that drive{" "}
            <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">personalized</code>{" "}
            CMS content.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="what">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            What ODP does in this stack
            <SectionAnchor id="what" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Several things flow through ODP in this app. The browser sends events (pageviews, identity) via
            the ODP tag. ODP aggregates those into a customer profile and evaluates segment
            membership (&quot;high-value-customers&quot;, &quot;retail-consumer&quot;). The server then
            queries that membership by visitor ID and maps qualifying segments to CMS content
            variations - the last mile of the{" "}
            <Link href="/demo/personalization" className="text-brand hover:underline font-medium">
              personalization
            </Link>{" "}
            flow.
          </p>
          <CodeBlock code={TAG_SNIPPET} label="The ODP tag (inlined in the root layout head)" />
        </section>

        <section id="identity">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Identity stitching
            <SectionAnchor id="identity" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            ODP tracks browsers by its own <code className="bg-surface-low px-1 rounded font-mono text-xs">vuid</code>{" "}
            cookie, but everything else in this app keys off{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code>{" "}
            (set by middleware, used by Feature Experimentation). Linking the two once via the{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">fs_user_id</code> identifier
            is what lets the server ask ODP about the same visitor the FX SDK is bucketing.
          </p>
          <CodeBlock code={IDENTITY_SNIPPET} label="src/components/OdpSetup.tsx" />
        </section>

        <section id="segments">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Server-side segment queries
            <SectionAnchor id="segments" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            ODP exposes a GraphQL API for profile data. The app asks one narrow question per
            request: of the segments this app cares about, which does the visitor qualify for? The
            subset filter keeps the query cheap, the 300s cache keeps it off the hot path, and any
            failure returns an empty array - personalization degrades to the default content, never
            to an error page.
          </p>
          <CodeBlock code={SEGMENT_QUERY_SNIPPET} label="src/lib/optimizely/odp.ts" />
        </section>

        <section id="mapping">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Segment-to-variation mapping
            <SectionAnchor id="mapping" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            ODP segment names and CMS variation names are owned by different teams and different
            systems, so the contract between them is a single explicit map. First qualifying segment
            wins. The resolved variation key feeds Graph&apos;s variation filter exactly like an FX
            bucketing decision does (see{" "}
            <Link href="/demo/personalization#odp-personalization" className="text-brand hover:underline font-medium">
              ODP personalization
            </Link>{" "}on the personalization page).
            The map is <strong className="text-on-surface">empty by default</strong> — ODP has no
            effect on content until you populate it with real segment-to-variation entries matching
            your ODP account and your CMS variation names.
          </p>
          <CodeBlock code={MAPPING_SNIPPET} label="The one place both sides meet" />
        </section>

        <section id="direct-path">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Direct path: ODP segments to CMS variants
            <SectionAnchor id="direct-path" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            No FX engine in the loop. Query the visitor&apos;s segments, map one to a CMS variation
            key, pass that key straight to Graph. Graph returns the matching CMS variant - or the
            original page if nothing matches. Use this path when personalizing for known behavioral
            segments with no experiment to run: no traffic split, no control group, no statistical
            results. If you need any of those, use the{" "}
            <Link href="/demo/feature-experimentation" className="text-brand hover:underline font-medium">
              FX path
            </Link>{" "}
            instead - it runs the identical Graph variation filter but adds bucketing, hold-out
            groups, and significance testing.
          </p>

          {/* Pipeline card */}
          <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-mono text-brand uppercase tracking-wider mb-3">ODP direct pipeline</p>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { label: "queryOdpSegments()", sub: "subset filtered, 300s cached" },
                { label: "resolveVariationKey()", sub: "first matching segment wins" },
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

          <CodeBlock code={DIRECT_PATH_SNIPPET} label="Complete Server Component — copy and adapt" />
        </section>

        <section id="events">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            ODP events vs FX events
            <SectionAnchor id="events" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            This app runs two tracking pipelines that are easy to confuse. ODP events feed the
            behavioral profile that segments are computed from. FX events (fired by{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">AutoTracker</code> through
            the FX SDK) feed experiment metrics. They share a visitor ID but nothing else - an ODP
            pageview never shows up in experiment results, and an FX conversion never moves segment
            membership.
          </p>
          <CodeBlock code={EVENTS_SNIPPET} label="Two pipelines, one visitor ID" />
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Link identities once, early.</strong> Sending fs_user_id to ODP on first load is what makes server-side segment queries by optimizelyEndUserId possible at all.</>,
          <><strong className="text-on-surface">Query segments with a subset filter.</strong> Ask ODP only about the segments your code maps to variations - not the whole profile.</>,
          <><strong className="text-on-surface">Cache segment membership.</strong> It changes slowly; revalidate: 300 keeps ODP off the request hot path.</>,
          <><strong className="text-on-surface">Fail to the default content.</strong> queryOdpSegments returns [] on any error - the visitor gets the original page, not a 500.</>,
          <><strong className="text-on-surface">Keep the segment-to-variation map in one file.</strong> ODP and the CMS name things independently; a single explicit contract is the only rename-safe design.</>,
          <><strong className="text-on-surface">ODP direct skips FX entirely.</strong> Resolve a variation key from segments and pass it straight to Graph - no bucketing, no experiment. Add FX when you need traffic splits or statistical results.</>,
          <><strong className="text-on-surface">ODP events and FX events are separate pipelines.</strong> Profiles and segments come from ODP events; experiment results come from FX events.</>,
        ]} />

        <SourcePanel
          heading="Source files"
          files={[
            { label: "lib/optimizely/odp.ts", path: "src/lib/optimizely/odp.ts", content: odpTs },
            { label: "components/OdpSetup.tsx", path: "src/components/OdpSetup.tsx", content: odpSetupTsx },
          ]}
        />

      </div>
    </>
  );
}
