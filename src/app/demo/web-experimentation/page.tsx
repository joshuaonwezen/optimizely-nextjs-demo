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
import InlineCode from "@/components/demo/InlineCode";
import { Pipeline } from "@/components/demo/Pipeline";

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

// The two routes side by side. Timings are measured on this instance against the
// live WX experiment on /investments.
const ROUTE_COST_TABLE: Array<{ dimension: string; softNav: string; prePaint: string }> = [
  {
    dimension: "First paint (LCP)",
    softNav: "Held region stays blank until the variation lands: ~300ms warm, ~1800ms cold",
    prePaint: "Variation is in the first paint, so the same as base content",
  },
  {
    dimension: "Layout shift (CLS)",
    softNav: "None. visibility keeps the box, so nothing moves",
    prePaint: "None. The flip happens before the first paint",
  },
  {
    dimension: "Main-thread work (INP)",
    softNav: "An RSC fetch plus a full subtree reconcile, right after hydration",
    prePaint: "Both subtrees hydrate and run their effects",
  },
  {
    dimension: "Extra requests",
    softNav: "One per bucketed visitor, cached and shared by the bucket",
    prePaint: "None",
  },
  {
    dimension: "HTML payload",
    softNav: "Base only",
    prePaint: "Base plus the variant: ~44KB raw, ~2.6KB gzip on this page",
  },
  {
    dimension: "Who pays it",
    softNav: "Only visitors bucketed into a matching variation",
    prePaint: "Every visitor of the page, bucketed or not",
  },
  {
    dimension: "What gets indexed",
    softNav: "Base content",
    prePaint: "Base content, plus a hidden second copy in the source",
  },
  {
    dimension: "URL hygiene",
    softNav: "A __v_ URL exists; canonical and sitemap keep it out of the index",
    prePaint: "No extra URL exists at all",
  },
  {
    dimension: "Multiple variations",
    softNav: "Any number",
    prePaint: "One only, otherwise it falls back to soft navigation",
  },
];

export default async function WebExperimentationDemoPage() {
  return (
    <>
      <DemoHero
        title="Web Experimentation"
        description="Web Experimentation decides in the browser, after the server has already answered. Its snippet is a blocking script in <head>, so the decision exists before the body is parsed. That is what lets a client-side bucket serve server-rendered CMS content on the very first pageview."
      >
        <div className="flex flex-wrap gap-3 mt-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ No cookie, no second pageview
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-lowest text-brand">
            ✓ Two delivery routes, switchable
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
            Teams who already run Web Experimentation and then adopt a headless CMS all hit the same
            question: how do I make my WX experiments serve content from the CMS content model? There
            are three ways to get a WX-style change onto the page. Two of them decide on the server.
            The third keeps WX as the decisioning engine, and that is what the rest of this page is
            about.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Ordering is what makes it work. WX decides <strong>in the browser</strong>, after the
            server has already sent the page, so it cannot influence that response. But the WX
            snippet is a <strong>blocking script in the document head</strong>. Its decision
            therefore exists <strong>before the browser parses the body or paints anything</strong>.
            That is the opening. The page can read a decision WX has already made, synchronously,
            with no network call and nothing stored.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Author it in Web Experimentation</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Build the change in WX&apos;s own visual editor. The snippet mutates the page in the
                browser, with no CMS or Graph involved. Its advantage is reach: it can change{" "}
                <em>anything</em> on the rendered page, including things nobody modeled in the CMS,
                without waiting on a developer. The tradeoff is that the content does not live in
                your CMS. If you only need changes the CMS already supports, the server-side routes
                are cleaner.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">no CMS needed</span>
            </div>

            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Decide server-side, serve CMS content</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Use this when the content must come from the CMS, so editors own it and it is
                server-rendered and cached. Make the decision <em>before</em> the HTML is sent.{" "}
                <Link href="/demo/feature-experimentation" className="text-brand hover:underline">Feature Experimentation</Link>{" "}
                handles experiments. The{" "}
                <Link href="/demo/odp" className="text-brand hover:underline">ODP-direct and custom paths</Link>{" "}
                handle personalization. The variant is in the first response, so there is no lag and
                no flicker.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">recommended</span>
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-6 flex flex-col gap-3">
              <h3 className="font-display font-semibold text-on-surface">Bridge WX to the CMS</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed flex-1">
                Use this when you must keep <strong>WX as the decisioning engine</strong> <em>and</em>{" "}
                the content must come from the <strong>CMS content model</strong>. The page reads the
                decision WX already made, before first paint, and renders the matching CMS variation
                on the same pageview. There are two ways to get that variation on screen, and they
                cost different things. Both are covered below.
              </p>
              <span className="self-start text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">first pageview</span>
            </div>
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mt-8 mb-2">
            How the bridge works
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            A CMS variation whose name starts with <InlineCode>wx_</InlineCode> opts its page into
            the bridge. That prefix does three jobs at once. It is the allowlist, so a made-up name
            can never reach Graph. It is the per-page opt-in, so a page with no{" "}
            <InlineCode>wx_</InlineCode> variation emits no extra markup and pays nothing. And it
            keeps WX clear of the unprefixed names, which are reserved for matching Feature
            Experimentation variation keys.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            On a page that has opted in, the server sends a short inline script. The script reads{" "}
            <InlineCode>getExperimentStates</InlineCode> synchronously. It intersects the variation
            names WX bucketed this visitor into with the names this page actually has. On a match it
            has a winner, and the delivery route takes over from there.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The base response is identical for every visitor, so it stays a single cached entry. The
            buckets do not fragment the cache.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Identity is already shared. <InlineCode>optimizelyEndUserId</InlineCode> is written
            domain-wide by middleware, and it is the same identifier the Web snippet uses. Both
            products see the same visitor, with no extra coordination.
          </p>
        </section>

        {/* The two delivery routes, compared */}
        <section id="delivery-modes">
          <DemoSectionHeading id="delivery-modes">Two Delivery Routes, Switchable in Settings{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The decision is the same in both routes. What differs is how the variation reaches the
            screen. Flip between them in the Settings panel (bottom-right) to see the difference on
            this instance, measured against a live WX experiment on{" "}
            <InlineCode>/investments</InlineCode>.
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold text-on-surface">Route 1 - Soft navigation</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-low text-on-surface-variant font-medium">default</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The server sends base content only. The script hides the region, the page fetches
                the variation route, then the clean URL is put back. The variation is <strong>not</strong>{" "}
                in the first paint, so the visitor waits on one cached request.
              </p>
              <ul className="text-xs font-mono text-on-surface-variant space-y-1">
                <li>hold engages ~110-220ms, before first paint</li>
                <li>variation visible ~300ms warm, ~1500ms cold</li>
                <li>one extra request · base response cached once</li>
              </ul>
            </div>

            <div className="bg-surface-lowest border-2 border-brand/40 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-semibold text-on-surface">Route 2 - Pre-paint swap</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand/10 text-brand font-medium">fastest</span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                The server sends base <em>and</em> the variant in one response. The script names the
                active one on <InlineCode>&lt;html&gt;</InlineCode> and CSS shows it, so the
                variation is in the first paint.
              </p>
              <ul className="text-xs font-mono text-on-surface-variant space-y-1">
                <li>variation in the first paint</li>
                <li>no request, no hold, no URL change</li>
                <li>costs ~44KB raw, ~2.6KB gzip of duplicate markup</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Both routes start from the same read. It runs inline in the head, after the blocking WX
            snippet, so the decision is already in memory. No network call, no storage, no callback.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden max-w-3xl">
            <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
              <span className="text-xs font-mono text-on-surface-variant">The shared read (inline, before any paint)</span>
            </div>
            <CodeBlock code={`// Emitted by the page only when it has wx_* variations.

var states = window.optimizely
  .get("state")
  .getExperimentStates({ isActive: true });

for (var id in states) {
  var s = states[id];
  // A holdback visitor is the control, so they get base
  // content. Only this shape exposes the flag at all:
  // getVariationMap() would report a bucket for them and
  // skew the test.
  if (s.isInExperimentHoldback) continue;
  live[s.variation.name] = s.experimentName;
}

// NAMES is the page's own wx_* variation list, so an
// unknown name can never reach Graph. Iterating NAMES
// keeps the winner deterministic across experiments.
for (var i = 0; i < NAMES.length; i++) {
  if (live[NAMES[i]]) { hit = NAMES[i]; break; }
}

// From here the two routes diverge.`} />
          </div>
        </section>

        {/* Route 1 */}
        <section id="route-soft-nav">
          <DemoSectionHeading id="route-soft-nav">Route 1 - Soft Navigation{" "}</DemoSectionHeading>

          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            In this route the server knows nothing about the visitor&apos;s bucket. It sends base
            content, and the browser goes and gets the variation. The trick is that the page hides
            the affected region <em>before</em> the first paint, so the visitor does not watch base
            content turn into the variation.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-4">Head - blocking, before any paint</p>
            <Pipeline
              steps={[
                { label: "WX snippet runs", sub: "decision in memory" },
                { label: "Inline read", sub: "matched name" },
                { label: "Region held", sub: "visibility: hidden" },
              ]}
            />
            <div className="border-t border-ghost-border my-4" />
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-4">Same pageview - variation fetched in</p>
            <Pipeline
              steps={[
                { label: "Hydration", sub: "reads the matched name" },
                { label: "router.replace", sub: "/__v_wx--wx_name" },
                { label: "Graph filter", sub: "variation: { SOME }" },
                { label: "Hold released", sub: "clean URL restored", highlight: true },
              ]}
            />
            <p className="text-[10px] font-mono text-on-surface-variant/60 mt-4">
              A visitor in no matching experiment never sets the attribute, so nothing is held and
              base content paints as normal.
            </p>
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">Step by step</h3>
          <ol className="text-sm text-on-surface-variant mb-6 max-w-3xl list-decimal pl-5 space-y-2 leading-relaxed">
            <li>
              The inline script has a match, so it sets{" "}
              <InlineCode>data-wx-pending</InlineCode> on <InlineCode>&lt;html&gt;</InlineCode>. One
              static CSS rule in the layout head reacts to it and hides the region.
            </li>
            <li>
              The hold uses <InlineCode>visibility</InlineCode>, not{" "}
              <InlineCode>display</InlineCode>. The region keeps its box, so the layout does not
              move and the hold costs no CLS.
            </li>
            <li>
              After hydration, <InlineCode>WxVariationSwap</InlineCode> soft-navigates to{" "}
              <InlineCode>/path/__v_wx--&lt;name&gt;</InlineCode>. That is the same URL shape
              middleware builds for FX, so the catch-all route needs no new code.
            </li>
            <li>
              The route turns the segment into a Graph variation filter and returns the CMS
              variation. React reconciles it into the tree already on screen.
            </li>
            <li>
              The hold attribute is removed and the clean path is put back in the address bar with{" "}
              <InlineCode>replaceState</InlineCode>. A 1500ms timer in the inline script is the
              backstop, so a page that never hydrates still reveals itself.
            </li>
          </ol>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">The hold: one attribute, one rule</span>
              </div>
              <CodeBlock language="js" code={`// The rule is static and lives in the layout <head>, so it
// is the same one line on every page:
//
//   html[data-wx-pending] [data-wx-region] { visibility: hidden }
//
// \`visibility\`, not \`display\`: the region keeps its box, so
// holding it cannot shift the page around (no CLS).

// ADD - inline script, before the first paint.
root.setAttribute("data-wx-pending", "");

// BACKSTOP - the timer lives in the inline script, not in a
// component, so it still fires if React never hydrates.
setTimeout(function () {
  root.removeAttribute("data-wx-pending");
}, 1500);

// REMOVE - WxVariationSwap, once the variation is on screen.
document.documentElement.removeAttribute("data-wx-pending");`} />
            </div>

            <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
                <span className="text-xs font-mono text-on-surface-variant">WxVariationSwap.tsx (the swap)</span>
              </div>
              <CodeBlock code={`// Routes to the variation using the same URL shape middleware
// builds for FX, so the catch-all page needs no new Graph
// query: it already reads __v_ segments.

const hit = window.__optiWxCms.read();

if (hit) {
  // Attribution first. WX reports its own conversions, but
  // exp_variant_string on GA4 events comes from here.
  recordVariation(hit.e, hit.v);

  startTransition(() => {
    router.replace(pathname + "/__v_wx--" + hit.v, { scroll: false });
  });
}

// On the next render the path contains __v_, which means the
// variation is on screen. That is where the hold is released
// and the clean URL is restored.
if (pathname.includes("/__v_")) {
  clearHold();
  restoreCleanUrl(state.doneFor);
}`} />
            </div>
          </div>

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
            <InlineCode>router.replace</InlineCode> fetches the RSC payload for the variation path
            and React reconciles it into the tree already on screen. There is no reload. The
            variation route is its own ISR entry, shared by everyone in the bucket, so the rest of
            the bucket pays no Graph round trip at all.
          </p>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">What it costs</h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The metric this route moves is <strong>LCP</strong>, the moment the biggest thing on
            screen finishes painting. The hold is <InlineCode>visibility: hidden</InlineCode>, which
            paints nothing, so nothing inside the held region can be the LCP element until the hold
            releases. For a bucketed visitor that pushes LCP out to the swap: roughly 300ms against
            a warm ISR entry, and ~1800ms measured against a cold one. If your hero sits inside the
            region, the hero is the LCP, so that delay is the whole above-the-fold experience.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            <strong>CLS</strong>, how much the layout jumps around, is the one thing the design
            deliberately protects. Holding with <InlineCode>visibility</InlineCode> rather than{" "}
            <InlineCode>display</InlineCode> keeps the box, so revealing the region shifts nothing.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            <strong>INP</strong>, how quickly the page answers a tap, gets the worst of it. The swap
            is an RSC fetch followed by React reconciling a whole page subtree, and it lands right
            after hydration, which is already the busiest moment on the main thread. There is also
            one extra request per bucketed visitor, and the variation route is its own ISR entry, so
            each <InlineCode>wx_</InlineCode> variation doubles the cached entries for that page.
            The first visitor into a cold bucket pays the full Graph round trip, which is exactly
            the ~1800ms case.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            For <strong>SEO</strong> this route is safe by default, with one gap worth closing
            yourself. The variation URL canonicalises back to the clean path, because{" "}
            <InlineCode>generateMetadata</InlineCode> strips the variation segment before it looks
            anything up, and the sitemap only ever lists clean routes. So{" "}
            <InlineCode>/savings/__v_wx--wx_treatment</InlineCode> should not be indexed as a page
            of its own. The gap is that <InlineCode>robots.txt</InlineCode> does not disallow{" "}
            <InlineCode>__v_</InlineCode>, and a canonical is a hint rather than a directive. If one
            of those URLs ever leaks into a link, a crawler can fetch it and get a 200. In
            production, a <InlineCode>noindex</InlineCode> on variation routes or a{" "}
            <InlineCode>Disallow: /*__v_</InlineCode> line is the belt to that canonical&apos;s
            braces.
          </p>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            The consolation is that only bucketed visitors pay any of this. A visitor in no matching
            experiment, one in the holdback, or anyone with the snippet blocked never sets the
            attribute, so nothing is held and base content paints immediately.
          </p>
        </section>

        {/* Route 2 */}
        <section id="route-pre-paint">
          <DemoSectionHeading id="route-pre-paint">Route 2 - Pre-paint Swap{" "}</DemoSectionHeading>

          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            In this route <strong>the server sends both versions in one response</strong>, and CSS
            picks one before the first paint. There is no second request and nothing to hold: by the
            time anything is painted, the page is already showing the right version.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            Three pieces do the work. The page renders two subtrees and tags each one. A static
            stylesheet hides the variant by default. The inline script sets one attribute on{" "}
            <InlineCode>&lt;html&gt;</InlineCode>, which reverses that default.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl p-5 mb-6">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-4">One response, one paint</p>
            <Pipeline
              steps={[
                { label: "Server responds", sub: "base + variant in one HTML" },
                { label: "WX snippet runs", sub: "decision in memory" },
                { label: "Inline read", sub: "matched name" },
                { label: "Attribute on <html>", sub: "data-cms-variation" },
                { label: "First paint", sub: "variant only", highlight: true },
              ]}
            />
            <p className="text-[10px] font-mono text-on-surface-variant/60 mt-4">
              No attribute means no flip, and the default CSS already shows base. JavaScript off,
              WX blocked, holdback and no-experiment all land there.
            </p>
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            1. What the server renders
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The variant is taken from the items Graph already returned for this page, so rendering
            both versions costs no extra round trip. Each subtree is wrapped in a div carrying a{" "}
            <strong>fixed token</strong>, <InlineCode>__base__</InlineCode> or{" "}
            <InlineCode>__variant__</InlineCode>, and the variant also carries its real name. The
            tokens are fixed because the CSS is static: a stylesheet in the layout head cannot match
            a variation name that changes per page.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
              <span className="text-xs font-mono text-on-surface-variant">Rendering both versions ([[...slug]]/page.tsx)</span>
            </div>
            <CodeBlock code={`// Pre-paint needs base AND the variant in one response. Capped at a
// single variant, which is all an experiment needs: the visitor is in
// exactly one bucket.
const wxDual = wxVariations.length === 1 && !decidedVariationApplies;

// The variant comes out of the items Graph ALREADY returned, because
// the page asked for the wx_ name in the same variation filter. No
// second query, no second round trip.
const wxVariantPage = wxDual
  ? matchedItems.find((i) => i._metadata?.variation === wxVariations[0])
  : null;

return (
  <>
    {/* Base. data-wx-region is still here because soft-nav mode is
        switchable at runtime and needs something to hold. */}
    <div data-cms-variant="__base__" data-wx-region="">
      <OptimizelyComponent content={page} />
    </div>

    {/* The variant. Fixed token + the real name alongside it, so the
        script can check the name and the CSS can match the token. */}
    <div data-cms-variant="__variant__" data-cms-variant-name="wx_treatment">
      <OptimizelyComponent content={wxVariantPage} />
    </div>
  </>
);`} />
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            2. The CSS that picks one
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Three rules, in one static string in the root layout&apos;s head. The first hides the
            variant, which is the state every visitor starts in. The other two only apply once{" "}
            <InlineCode>&lt;html&gt;</InlineCode> carries the attribute, and they reverse it.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
              <span className="text-xs font-mono text-on-surface-variant">WX_REVEAL_STYLE (static, in the layout head)</span>
            </div>
            <CodeBlock language="css" code={`/* Default: base shows, the variant is hidden. Nothing has run yet,
   so JavaScript off, WX blocked, a holdback visitor and "no matching
   experiment" all render base correctly with no script at all. */
[data-cms-variant="__variant__"] { display: none }

/* After the flip: the two rules swap over. */
html[data-cms-variation] [data-cms-variant="__variant__"] { display: revert }
html[data-cms-variation] [data-cms-variant="__base__"]    { display: none }

/* Two rules of thumb this encodes:

   Use display, not visibility. A visibility-hidden element still
   intersects the viewport, so AutoTracker's IntersectionObserver
   would fire a second mb_feature_viewed for the hidden copy.
   display:none generates no boxes at all.

   Static, never a per-page <style> next to the content. That was
   tried: it adds a sibling node the client tree does not have in
   the same place, which shifts alignment by one and produces a
   hydration mismatch. */`} />
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            3. The line that flips it
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            One <InlineCode>setAttribute</InlineCode> is the entire swap. On a hard load it runs in
            the head, before anything is painted, and it is <strong>never removed</strong>: the page
            is showing the right version, so there is nothing to undo. The add-and-remove pair
            belongs to the other route, where the attribute is a temporary hold rather than a
            permanent choice.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
              <span className="text-xs font-mono text-on-surface-variant">The flip, on a hard load and on a client-side navigation</span>
            </div>
            <CodeBlock language="js" code={`// Inline script in <head>, after the blocking WX snippet. Both
// subtrees are already in the document at this point.

// DUAL is false when the server sent no variant. Setting the
// attribute then would hide base and show nothing, so fall back
// to the soft-nav route instead.
if (!DUAL) prepaint = false;

var hit = g.read();          // { v: "wx_treatment", e: "Hero test" }

if (hit && prepaint) {
  // The whole swap. One attribute, before the first paint: the CSS
  // above now hides base and shows the variant.
  root.setAttribute("data-cms-variation", hit.v);
  return;                    // no hold, no timer, no request
}

// A CLIENT-SIDE navigation has no blocking script, and React does
// not re-run an inline one, so WxVariationSwap repeats the flip
// after hydration. Same attribute, same CSS, but the reveal is a
// visible change rather than something the visitor never sees.
if (hit && revealable(hit.v)) {
  document.documentElement.setAttribute("data-cms-variation", hit.v);
}

// revealable() checks the variant is really on the page:
//   document
//     .querySelector('[data-cms-variant="__variant__"]')
//     ?.getAttribute("data-cms-variant-name") === name`} />
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            4. Both copies are live
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            This is the part that catches people. CSS hides pixels, it does not stop JavaScript.
            Both subtrees are in the DOM, so both hydrate and both run their effects. Any client
            component placed inside a variation has to check whether it is the copy on screen.
          </p>

          <div className="bg-surface-lowest border border-ghost-border rounded-2xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-ghost-border bg-surface-low">
              <span className="text-xs font-mono text-on-surface-variant">isInactiveVariant() (wxVariation.ts)</span>
            </div>
            <CodeBlock code={`export function isInactiveVariant(el: Element | null): boolean {
  const wrapper = el?.closest("[data-cms-variant]");
  if (!wrapper) return false;

  // Which token is live right now. The same attribute the flip set
  // is the single source of truth, so CSS and JS can never disagree.
  const active = document.documentElement.hasAttribute("data-cms-variation")
    ? "__variant__"
    : "__base__";

  return wrapper.getAttribute("data-cms-variant") !== active;
}

// Three components guard with it today:
//   FxBucketingEvent        decide() fires a REAL impression, so a
//                           duplicate permanently skews the experiment
//   AutoTracker             would double-count mb_feature_viewed
//   RecommendationBlockClient  would fetch twice`} />
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">What it costs</h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Speed is where this route wins, and that is the point of it. There is no hold and no
            request, so a bucketed visitor&apos;s <strong>LCP</strong> matches a base
            visitor&apos;s. <strong>CLS</strong> is untouched too, because the flip lands before the
            first paint and nothing on screen ever changes.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The bill arrives in the payload, and <strong>everyone pays it</strong>. The server
            cannot know which bucket a visitor is in, so the duplicate subtree ships to every
            visitor of that page, including the holdback and everyone in no experiment at all. That
            is the exact inverse of soft navigation, where only bucketed visitors pay anything.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The ~2.6KB gzipped figure flatters it, too. Compression only helps the wire. The browser
            still parses both copies, builds DOM nodes for both, and React still hydrates both, so
            the real cost is DOM size and main-thread hydration work rather than the ~44KB raw. That
            shows up as <strong>TBT and INP</strong>, how long the main thread is blocked and how
            quickly the page answers a tap, and it is felt on low-end devices rather than on your
            laptop. <InlineCode>isInactiveVariant()</InlineCode> stops the hidden copy firing
            duplicate analytics, but it does not stop the work.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            For <strong>SEO</strong>, the page now contains the content twice. A crawler sees two{" "}
            <InlineCode>&lt;h1&gt;</InlineCode> elements on any page whose variation contains a
            product hero, every heading and paragraph twice, and every{" "}
            <InlineCode>alt</InlineCode> string twice. Google does index{" "}
            <InlineCode>display: none</InlineCode> content and discounts it, so this is unlikely to
            hurt rankings, but it muddies the page outline and it will confuse any audit tool you
            point at the page. Duplicate element ids are also invalid HTML, which is the real reason
            forms are unsupported inside a variation: a <InlineCode>&lt;label for&gt;</InlineCode>{" "}
            can resolve to the hidden copy. Anchor targets and{" "}
            <InlineCode>aria-labelledby</InlineCode> have the same hazard, and if you ever add
            JSON-LD to a block, the page will carry two copies of the same structured data. One
            image caveat belongs here too: a hero background with{" "}
            <InlineCode>priority</InlineCode> preloads from the head regardless of CSS, so the
            hidden copy would compete for LCP bandwidth.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Where this route beats the other outright is URL hygiene. No{" "}
            <InlineCode>__v_</InlineCode> URL is ever created, so there is nothing to canonicalise,
            nothing to keep out of the sitemap and nothing that can leak.
          </p>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Two limits to plan around. A client-side navigation has no blocking script, so the
            reveal lands after the paint and the visitor watches base content change: the same
            flicker soft navigation has, in the one case pre-paint cannot avoid. And the route
            handles exactly one variation per page. An A/B/C test falls back to soft navigation
            automatically, which is the right behaviour but not always the one you expected.
          </p>
        </section>

        {/* Setting it up */}
        <section id="wx-setup">
          <DemoSectionHeading id="wx-setup">Setting It Up{" "}</DemoSectionHeading>

          <div className="space-y-6 max-w-2xl">
            <Step number={1} title="Create the CMS variation in Visual Builder">
              In the CMS, open the page you want to experiment on and click{" "}
              <strong>Add variation</strong>. Name it with the <InlineCode>wx_</InlineCode> prefix,
              for example <InlineCode>wx_treatment</InlineCode>. Edit the variation&apos;s
              composition and publish it. Variations can only be <em>created</em> in the Visual
              Builder UI. No REST path creates one.
            </Step>

            <Step number={2} title="Name the WX variation identically">
              In the Web Experimentation UI, name the experiment&apos;s variation exactly the same
              string, <InlineCode>wx_treatment</InlineCode>, case-sensitive. That is the entire
              WX-side configuration: <strong>no Custom JS action</strong> and no snippet edit. Name
              the control variation anything that is not a CMS variation name and it falls through
              to base content, which Graph&apos;s <InlineCode>includeOriginal: true</InlineCode>{" "}
              guarantees. A visitor in the experiment&apos;s <strong>holdback</strong> also gets base
              content. The bridge checks that explicitly, because serving a holdback visitor the
              variation would corrupt the result.
            </Step>

            <Step number={3} title="Verify it without a live WX experiment">
              The two halves can be checked independently. For the server half, request the
              variation route directly,{" "}
              <InlineCode>/savings/__v_wx--wx_treatment</InlineCode>, and confirm it returns the
              variation rather than a 307. A name the CMS does not have is redirected away, so the
              same request with a made-up name is the negative test. For the browser half, open a
              page that has a <InlineCode>wx_</InlineCode> variation and call{" "}
              <InlineCode>window.__optiWxCms.read()</InlineCode> in the console. It returns the
              matched name and experiment, or null when the visitor is in no matching bucket.
            </Step>

            <Step number={4} title="FX and Web Experimentation can coexist">
              FX and WX can run on the same page at the same time, and FX wins. FX decides on the
              server, so by the time the browser could read a WX decision the URL already carries an
              FX variation segment and the bridge stands down. The two never fight over the same
              render. A WX decision also deliberately fires <strong>no</strong> FX impression: there
              is no FX flag behind it, and recording one would put a phantom decision in FX&apos;s
              reporting.
            </Step>
          </div>
        </section>

        {/* Traffic back the other way */}
        <section id="wx-odp">
          <DemoSectionHeading id="wx-odp">ODP Segments as WX Audience Attributes{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Sharing a visitor ID is not the same as sharing what you know about that visitor. The
            traffic above runs one way only: out of WX and into the server. The return leg is a
            small client component. It pushes the shared profile into WX as user attributes:
            persona, ODP segment, top category, and the variation that was served.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            That is the integration worth knowing about. WX decides in the browser, so it only sees
            what the browser can see. ODP holds cross-session behaviour and the CMS holds the
            taxonomy. Pushing both in as WX user attributes means an audience built on a{" "}
            <Link href="/demo/odp" className="text-brand hover:underline">behavioural ODP segment</Link>{" "}
            or a content category becomes targetable from the WX visual editor, with no deploy.
          </p>
          <Callout variant="note">
            Timing is the catch, and it is the mirror image of the bridge above. WX evaluates
            audiences at page activation, and this push lands after hydration, so the attributes
            apply from the <strong>next</strong> activation. An audience built on them is therefore
            a second-pageview audience. That is exactly the lag the variation bridge was rebuilt to
            avoid, which is why it is worth knowing which direction you are relying on.
          </Callout>
        </section>

        {/* Caveats */}
        <section id="caveats">
          <DemoSectionHeading id="caveats">Caveats and Costs{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The two routes side by side, then the things that are true of both.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-ghost-border mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low border-b border-ghost-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Soft navigation</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Pre-paint swap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-border">
                {ROUTE_COST_TABLE.map((row) => (
                  <tr key={row.dimension} className="bg-surface-lowest hover:bg-surface-low transition-colors">
                    <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{row.dimension}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.softNav}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{row.prePaint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            What both routes cost you
          </h3>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The WX snippet is a blocking script in the head. That is deliberate, and it is what
            makes the whole bridge possible, but it means every visitor on every page waits for it
            before the first paint, whether or not they are in an experiment. It is the entry fee
            for this approach, and it is paid site-wide.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            A WX variation also cannot change the page&apos;s{" "}
            <InlineCode>&lt;title&gt;</InlineCode>, meta description or OG image, in either route.{" "}
            <InlineCode>generateMetadata</InlineCode> strips variation segments before it looks
            anything up, so the metadata always comes from the base page. If your test rewrites the
            headline, the search result and the social card still show the original.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            And crawlers get base content either way, because neither route changes the server
            response for them. For an A/B test that is exactly right, and it is what Google asks
            for. For personalization it is a real limitation: the segment-specific content is
            invisible to search, so anything that has to rank must live in the base version.
          </p>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            When soft navigation loses its own race
          </h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The hold narrows the flicker, it does not remove it. Against a warm ISR entry the swap
            is roughly 300ms and nothing flashes. Against a cold entry for the variation route it
            has been measured at ~1800ms, which outruns the 1500ms hold failsafe. The hold releases,
            base content paints, and the visitor watches it change: the worst of both, and the
            reason the failsafe is not set higher is that a longer blank region is worse still. If
            you can move the decision to the server, with FX or the ODP-direct paths, both the hold
            and the flicker go away. That is the honest reason the server-side routes are still
            marked recommended.
          </p>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            Some activation modes decide too late to hold
          </h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The synchronous read only works because the snippet is blocking and the page uses
            WX&apos;s default immediate activation. With polling, callback or manual activation, or
            an audience that needs a network call, the decision lands after the first paint. The
            bridge still applies the variation, but as a visible change rather than a held region.
            Holding speculatively would tax every visitor to help a few.
          </p>

          <h3 className="font-display text-lg font-bold text-on-surface mb-2">
            This demo carries both routes at once
          </h3>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl">
            The route switch is client-side, so it can be flipped without a server round trip. That
            means <em>both</em> routes ship the duplicate markup here. The demo shows the timing
            difference faithfully but not the payload difference, so read the payload row of the
            table as what you would get in production, where you would pick one route and render
            only that.
          </p>

          <Callout variant="note">
            <strong>Web Experimentation statistics are unaffected.</strong>{" "}
            WX tracks its own decision events and conversions through the snippet. The bridge only
            changes which CMS content variant is served, so all statistical analysis stays in the WX
            dashboard. The variation and its experiment name are also recorded into the shared
            variation map, so GA4 events carry it in <InlineCode>exp_variant_string</InlineCode>{" "}
            alongside FX variations.
          </Callout>
        </section>

        {/* Personalization with WX */}
        <section id="wx-personalization">
          <DemoSectionHeading id="wx-personalization">Personalization, Not Just Experiments{" "}</DemoSectionHeading>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            Everything above is written in terms of an A/B experiment, but the delivery does not
            care. A Web Experimentation{" "}
            <strong className="text-on-surface">Personalization campaign</strong> buckets visitors
            by audience rather than by traffic split, and the bridge reads it exactly the same way.
            The campaign&apos;s variation name is matched against this page&apos;s{" "}
            <InlineCode>wx_</InlineCode> variations, and the matching CMS content is served.
          </p>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl">
            The one difference worth knowing is the holdback. An experiment has a control group that
            must keep seeing base content, which is why the reader checks{" "}
            <InlineCode>isInExperimentHoldback</InlineCode>. A personalization campaign usually has
            no holdback, so every qualifying visitor gets the variation. That makes pre-paint the
            obvious route: there is no measurement to protect, and no reason to accept a held
            region.
          </p>
          <Callout variant="note">
            If the audience you want to target is a behavioural one, built from cross-session events
            rather than anything on the current request, define it in ODP and push it in as a WX
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
