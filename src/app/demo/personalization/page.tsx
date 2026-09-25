import type { Metadata } from "next";
import Link from "next/link";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Personalization: Choosing a Path",
};

// This page is deliberately thin: it exists to compare the four paths and hand off. Each
// product is documented on its own page - /demo/feature-experimentation, /demo/web-experimentation
// and /demo/odp - so a reader after one mechanism is not skimming the other three.
export default async function PersonalizationDemoPage() {
  return (
    <>
      <DemoHero
        title="Personalization & Audiences"
        description="Four paths to personalized CMS content - from the full Optimizely stack (FX + ODP) down to bringing your own audience logic entirely. All server-side paths feed the same Graph variation filter. Start here, then follow the path you need."
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
                to serve CMS content - the bridge below reads WX&apos;s decision before first paint and routes the
                render to the matching CMS variation - but the server-side paths above are still simpler, because
                they decide before the HTML is sent and so cannot flicker.{" "}
                <a href="#web-experimentation-bridge" className="text-brand hover:underline">See the bridge below.</a>
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


          {/* Where each path is documented */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/demo/feature-experimentation"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Path 1 · server-side</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Feature Experimentation
              </p>
              <p className="text-xs text-on-surface-variant">
                The middleware mechanism end to end: decide at the edge, carry the variation in the
                path, filter in Graph. Also how ODP segments become FX audiences, and how to
                personalize with a rollout instead of an experiment.
              </p>
            </Link>
            <Link
              href="/demo/web-experimentation"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Path 4 · client-side</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                Web Experimentation
              </p>
              <p className="text-xs text-on-surface-variant">
                Two implemented ways to turn a browser-side WX decision into CMS content, the
                tradeoff between them, and pushing ODP segments in as WX audience attributes.
              </p>
            </Link>
            <Link
              href="/demo/odp"
              className="bg-surface-lowest border border-ghost-border hover:border-brand/40 rounded-2xl p-5 transition-colors group"
            >
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">Path 2 · data layer</p>
              <p className="font-display font-semibold text-on-surface group-hover:text-brand transition-colors text-sm mb-1">
                ODP
              </p>
              <p className="text-xs text-on-surface-variant">
                Profiles, identity stitching and segments, driving Graph directly with no
                experiment in the loop. The live Settings panel lives here too.
              </p>
            </Link>
          </div>
        </section>

        {/* Personalization vs experimentation - the framing every path shares */}
        <section id="personalization-vs-experimentation">
          <DemoSectionHeading id="personalization-vs-experimentation">Personalization or Experimentation?{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Every path above can do either, and the difference is not the mechanism - it is whether
            you are measuring. An <strong className="text-on-surface">experiment</strong> splits a
            single audience and compares outcomes.{" "}
            <strong className="text-on-surface">Personalization</strong> targets a known audience and
            serves them different content on purpose, with nothing to prove. The delivery is
            identical; only the configuration and the reporting differ.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">With FX</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A rollout with an audience condition and no second variation. Same middleware, same
                Graph filter, no traffic split and no statistics.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">With Web Experimentation</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                A Personalization campaign rather than an A/B test. It buckets and applies changes
                through exactly the same client-side delivery.
              </p>
            </div>
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <p className="text-xs font-mono text-on-surface-variant mb-2 uppercase tracking-wider">With ODP directly</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Segment membership maps straight to a variation key. This one is personalization by
                construction - there is no experiment engine involved at all.
              </p>
            </div>
          </div>
          <Callout variant="note" className="mt-4">
            Reaching for an experiment when you only need personalization costs you a traffic split
            and a results page nobody reads. Reaching for personalization when you needed an
            experiment costs you the ability to say whether it worked.
          </Callout>
        </section>

      </div>
    </>
  );
}
