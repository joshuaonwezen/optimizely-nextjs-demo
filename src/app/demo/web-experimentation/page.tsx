import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import SourcePanel from "@/components/demo/SourcePanel";
import { Callout } from "@/components/blocks/CalloutBlock";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import Step from "@/components/demo/Step";
import DemoSectionHeading from "@/components/demo/DemoSectionHeading";

export const dynamic = "force-dynamic";

const wxVariationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/optimizely/wxVariation.ts"),
  "utf8"
);
const wxVariationSwapTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/personalization/WxVariationSwap.tsx"),
  "utf8"
);
const wxProfileBridgeTsx = fs.readFileSync(
  path.join(process.cwd(), "src/components/personalization/WxProfileBridge.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Web Experimentation",
};

export default async function WebExperimentationDemoPage() {
  return (
    <>
      <DemoHero
        title="Web Experimentation"
        description="Web Experimentation decides in the browser, after the server has already responded. Its snippet is a blocking script in <head>, though, so the decision exists before the body is parsed - which is what lets a client-side bucket serve server-rendered CMS content on the first pageview."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ No cookie, no second pageview
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ Two delivery modes, switchable
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-badge-bg text-on-brand">
            Content stays in the CMS
          </span>
        </div>
      </DemoHero>

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-16">

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
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The ordering is what makes it work. WX decides <strong>in the browser</strong>, after the
            server has rendered and sent the page - so it cannot influence that response. But the WX
            snippet is a <strong>blocking script in the document head</strong>, which means its decision
            exists <strong>before the browser parses the body or paints anything</strong>. That is the
            opening: the page can read a decision WX has already made, synchronously, with no network
            call and nothing stored.
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
                WX already made before first paint, holds the affected region, and routes the render to the
                matching CMS variation, so it lands on the first pageview. The cost is real: that region is
                blank until the variation arrives, and when it arrives late the base content paints first
                and the visitor watches it change.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">first pageview, flicker cost</span>
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
            The variation route carries a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">__v_wx--&lt;name&gt;</code>{" "}
            segment, and once the variation is on screen the clean path is put back in the address bar
            with <code className="bg-surface-low px-1 rounded font-mono text-xs">replaceState</code>, so
            the segment stays an implementation detail. The router keeps its own tree, so a refresh still
            re-fetches the variation, while a hard reload starts from base content and simply swaps again.
            The URL remains addressable if you type it, which is what the verification step below uses.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Identity is already shared:{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code>{" "}
            is written domain-wide by middleware and is the same identifier the Web snippet uses. Both
            products see the same visitor with no extra coordination needed.
          </p>

        </section>

        {/* The two delivery modes and what each costs */}
        <section id="delivery-modes">
          <DemoSectionHeading id="delivery-modes">Two Delivery Modes, Switchable in Settings{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The decision is the same in both; what differs is how the variation reaches the screen.
            Flip between them in the Settings panel (bottom-right) to see the difference on this
            instance - measured against a live WX experiment on{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">/investments</code>.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold text-on-surface">Soft navigation</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">default</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                Hold the region, fetch the variation route, restore the clean URL. The variation is
                <strong> not</strong> in the first paint, so the visitor waits on one cached request.
              </p>
              <ul className="text-xs font-mono text-on-surface-variant space-y-1">
                <li>hold engages ~110-220ms, before first paint</li>
                <li>variation visible ~300ms warm, ~1500ms cold</li>
                <li>one extra request · base response cached once</li>
              </ul>
            </div>

            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-display font-semibold text-on-surface">Pre-paint swap</h4>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">fastest</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The server already sent base <em>and</em> the variant. The inline script names the
                active one on{" "}
                <code className="bg-surface-low px-1 rounded font-mono text-xs">&lt;html&gt;</code>{" "}
                and CSS reveals it, so the variation is in the first paint.
              </p>
              <ul className="text-xs font-mono text-on-surface-variant space-y-1">
                <li>variation in the first paint</li>
                <li>no request, no hold, no URL change</li>
                <li>costs ~44KB raw, ~2.6KB gzip of duplicate markup</li>
              </ul>
            </div>
          </div>
          {/* Single-request architecture diagram */}
          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-8">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-4">One pageview, decided before first paint</p>
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
                    { label: "CMS variant", sub: "clean URL restored", highlight: true },
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

        </section>

        {/* Setting it up, and the code that does it */}
        <section id="wx-setup">
          <DemoSectionHeading id="wx-setup">Setting It Up{" "}</DemoSectionHeading>

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
              case-sensitive. That is the entire WX-side configuration: <strong>no Custom JS action</strong>{" "}
              and no snippet edit. Leave the control variation named anything that is not a CMS
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

          {/* The server side of the swap: the variation route and the query it sends */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">The variation route ([[...slug]]/page.tsx)</span>
              </div>
              <CodeBlock code={`// /savings/__v_wx--wx_treatment arrives here as
// slug = ["savings", "__v_wx--wx_treatment"]. The swap adds
// no route: this is the same code path FX segments took.

const { cleanSlug, activeVariations } = extractVariations(slug);
// cleanSlug        -> ["savings"]      the URL Graph is asked for
// activeVariations -> ["wx_treatment"] the variation filter

// includeOriginal is what keeps an unmatched visitor served:
// without it Graph returns nothing rather than base content.
const variationFilter = activeVariations.length > 0
  ? {
      variation: {
        include: "SOME",
        value: activeVariations,
        includeOriginal: true,
      },
    }
  : undefined;

const items = await client.getContentByPath("/savings/", variationFilter);

// Graph can return the variation AND the base version, so
// pick the named one and fall back to base.
const page =
  items.find((i) =>
    activeVariations.includes(i._metadata?.variation ?? "")
  ) ?? items[0];

return <OptimizelyComponent content={page} />;`} />
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">What reaches Graph</span>
              </div>
              <CodeBlock language="graphql" code={`# getContentByPath() generates this from the resolved content
# type: one fragment per registered type, plus the variation
# name so the caller can tell which version came back.

query ListContent($where: _ContentWhereInput, $variation: VariationInput) {
  _Content(where: $where, variation: $variation) {
    items {
      __typename
      ...DynamicExperience
      _metadata { variation }
    }
  }
}

# Variables. The real where clause is an _or over the
# trailing-slash and hierarchical forms of the URL - one here.
{
  "where": { "_metadata": { "url": { "default": { "eq": "/savings/" } } } },
  "variation": {
    "include": "SOME",
    "value": ["wx_treatment"],
    "includeOriginal": true
  }
}`} />
            </div>
          </div>

          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Nothing in that route knows a swap happened.{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">router.replace</code>{" "}
            fetches the RSC payload for the variation path, React reconciles it into the tree already on
            screen, and the held region reveals with the CMS variation in place - no reload, and no extra
            Graph round trip for the rest of the bucket, because the variation route is its own ISR entry
            they all share.
          </p>

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

        </section>

        {/* Traffic back the other way: what the server knows, pushed into WX */}
        <section id="wx-odp">
          <DemoSectionHeading id="wx-odp">ODP Segments as WX Audience Attributes{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-8 max-w-3xl">
            Sharing a visitor ID is not the same as sharing what you know about that visitor, though,
            and the traffic above only runs one way - out of WX and into the server. The return leg is{" "}
            a small client component,
            which pushes the shared profile in as WX user attributes: persona, ODP segment, top
            category and the variation that was served. That is what lets a marketer target a WX
            experiment at a CMS taxonomy term or an ODP audience from the WX UI, with no deploy.
            Be aware of the timing - WX evaluates audiences at page activation and this push lands
            after hydration, so the attributes apply from the <strong>next</strong> activation rather
            than this one.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            That is the integration worth knowing about: WX decides in the browser and therefore only
            sees what the browser can see, while ODP holds cross-session behaviour and the CMS holds
            the taxonomy. Pushing both in as WX user attributes means an audience built on a{" "}
            <Link href="/demo/odp" className="text-brand hover:underline">behavioural ODP segment</Link>{" "}
            or a content category becomes targetable from the WX visual editor, with no deploy.
          </p>
          <Callout variant="note">
            Timing is the catch, and it is the mirror image of the bridge above. WX evaluates
            audiences at page activation and this push lands after hydration, so the attributes apply
            from the <strong>next</strong> activation. An audience built on them is therefore a
            second-pageview audience - which is exactly the lag the variation bridge was rebuilt to
            avoid, and why it is worth knowing which direction you are relying on.
          </Callout>
        </section>

        {/* What each mode costs */}
        <section id="caveats">
          <DemoSectionHeading id="caveats">Caveats and Costs{" "}</DemoSectionHeading>
          <div className="space-y-3">
            <Callout variant="warning">
              <strong>The bridge narrows the flicker, it does not remove it.</strong>{" "}
              A bucketed visitor&apos;s region is held blank (via{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">visibility</code>, so layout
              is reserved and the hold costs no CLS) until the variation arrives. Against a warm ISR entry
              that is roughly 300ms and nothing flashes. Against a cold entry for the variation route the
              swap has been measured at ~1800ms, which outruns the 1500ms hold failsafe: the hold releases,
              base content paints, and the visitor sees it change. An in-app (soft) navigation always looks
              like that, because there is no blocking script to hold behind. Nobody outside a matching
              experiment pays either cost - a visitor in no matching experiment, one in the holdback, or
              anyone with the snippet blocked never sets the attribute and paints base content immediately.
              If you can move the decision to the server - FX, or the ODP-direct paths above - do that and
              both the hold and the flicker go away. This is the honest reason the server-side paths are
              still marked recommended.
            </Callout>

            <Callout variant="note">
              <strong>Some activation modes decide too late to hold.</strong>{" "}
              The synchronous read only works because the snippet is blocking and the page uses WX&apos;s
              default immediate activation. With polling, callback or manual activation, or an audience that
              needs a network call, the decision lands after first paint. The bridge still applies the
              variation in that case, but as a visible change rather than a held region, since holding
              speculatively would tax every visitor to help a few.
            </Callout>

            <Callout variant="note">
              <strong>What the two modes cost, honestly.</strong>{" "}
              Pre-paint duplicates the page subtree, which on this page is about 44KB raw but only
              ~2.6KB gzipped, because the copy compresses against itself. Because the switch is
              client-side so it can be flipped without a server round trip, <em>both</em> modes carry
              that duplicate here - the demo shows the timing difference faithfully but not the
              payload difference. In production you would pick one and render only that. Two things
              are unsupported inside a{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code> variation:
              forms, whose element ids would be duplicated so a label focuses the hidden copy, and a
              hero background image, whose{" "}
              <code className="bg-surface-low px-1 rounded font-mono text-xs">priority</code> preload
              is emitted from the head regardless of CSS and would compete for LCP.
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

        {/* Personalization with WX */}
        <section id="wx-personalization">
          <DemoSectionHeading id="wx-personalization">Personalization, Not Just Experiments{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Everything above is written in terms of an A/B experiment, but the delivery does not care.
            A Web Experimentation <strong className="text-on-surface">Personalization campaign</strong>{" "}
            buckets visitors by audience rather than by traffic split, and the bridge reads it exactly
            the same way: the campaign&apos;s variation name is matched against this page&apos;s{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">wx_</code> variations and
            the matching CMS content is served.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The one difference worth knowing is the holdback. An experiment has a control group that
            must keep seeing base content, which is why the reader checks{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">isInExperimentHoldback</code>.
            A personalization campaign usually has no holdback, so every qualifying visitor gets the
            variation - and the pre-paint mode becomes the obvious choice, since there is no
            measurement to protect and no reason to accept a held region.
          </p>
          <Callout variant="note">
            If the audience you want to target is a behavioural one - built from cross-session events
            rather than anything on the current request - define it in ODP and push it in as a WX
            attribute (see above), or skip WX entirely and let{" "}
            <Link href="/demo/odp" className="text-brand hover:underline">ODP drive Graph directly</Link>.
          </Callout>
        </section>

        <SourcePanel
          heading="How this reference implementation does it"
          files={[
            {
              label: "wxVariation.ts",
              path: "src/lib/optimizely/wxVariation.ts",
              content: wxVariationTs,
            },
            {
              label: "WxVariationSwap.tsx",
              path: "src/components/personalization/WxVariationSwap.tsx",
              content: wxVariationSwapTsx,
            },
            {
              label: "WxProfileBridge.tsx",
              path: "src/components/personalization/WxProfileBridge.tsx",
              content: wxProfileBridgeTsx,
            },
          ]}
        />

      </div>
    </>
  );
}
