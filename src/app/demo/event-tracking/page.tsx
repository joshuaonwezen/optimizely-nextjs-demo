import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import DemoHero from "@/components/demo/DemoHero";
import CodeBlock from "@/components/demo/CodeBlock";
import SectionAnchor from "@/components/demo/SectionAnchor";
import KeyPoints from "@/components/demo/KeyPoints";
import SourcePanel from "@/components/demo/SourcePanel";
import ConversionDemo from "./ConversionDemo";

export const dynamic = "force-dynamic";

const trackingIndexTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tracking/index.ts"),
  "utf8"
);
const activeVariationsTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tracking/activeVariations.ts"),
  "utf8"
);
const fxDestinationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tracking/destinations/fx.ts"),
  "utf8"
);
const odpDestinationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tracking/destinations/odp.ts"),
  "utf8"
);
const dataLayerDestinationTs = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tracking/destinations/dataLayer.ts"),
  "utf8"
);
const autoTrackerTs = fs.readFileSync(
  path.join(process.cwd(), "src/components/AutoTracker.tsx"),
  "utf8"
);
const conversionDemoTs = fs.readFileSync(
  path.join(process.cwd(), "src/app/demo/event-tracking/ConversionDemo.tsx"),
  "utf8"
);

export const metadata: Metadata = {
  title: "Event Tracking",
};

const DESTINATION_SNIPPET = `// A destination is anything that can receive an event.

export type TrackedEvent = {
  key: string;
  tags: Record<string, string | number | boolean>;
  userId: string;      // the stable visitor id, shared with every product
  timestamp: number;
};

export type TrackingDestination = {
  name: string;
  send(event: TrackedEvent): DeliveryStatus | Promise<DeliveryStatus>;
};

// The wrapper fans a single call out to every registered destination.
// One failing sink never blocks the others - each send() is isolated
// in its own try/catch, and errors are swallowed: tracking must never
// break the page.
//
// Before building the event, wait for flag decisions to settle, then stamp
// on exp_variant_string - the variations actually rendered on this page, as
// RuleKey-VariationName, comma joined. On a page that served none, omit the
// tag entirely rather than sending it blank.

await trackEvent("cta_click", { source: "pricing-page" });
// → FX:        user.trackEvent("cta_click", tags)
// → ODP:       zaius.event("cta_click", { ...tags })
// → dataLayer: window.dataLayer.push({ event: "cta_click", ... })
//
// tags now include, where a variation was served:
//   exp_variant_string: "checkout_layout_test-single_step"`;

const ADD_DESTINATION_SNIPPET = `// Adding a source is one object - no call sites change.
import { registerDestination } from "@/lib/tracking";

registerDestination({
  name: "Segment",
  send(event) {
    if (!window.analytics) return "skipped";
    window.analytics.track(event.key, { ...event.tags, userId: event.userId });
    return "sent";
  },
});

// Every existing trackEvent() call - CTA clicks, form submits,
// scroll depth, outbound links - now also reaches Segment.`;

const CONVERSION_LOOP_SNIPPET = `// 1. Bucket the visitor server-side and SUPPRESS the decision event
//    (DISABLE_DECISION_EVENT) - deciding is not seeing.
const decision = user.decide("checkout_layout");   // no event fired

// 2. Whatever actually renders the variation fires the decision event
//    client-side, with the same visitor id.
ctx.decide("checkout_layout", []);                 // empty options = fire it

// 3. The conversion fires through the tracking layer with that SAME
//    visitor id, so results can attribute it to the bucketed variation.
trackEvent("cta_click", { source: "hero" });

// Results then compares conversion rates per variation:
//   variation A: 1,204 decision events, 87 cta_click  → 7.2%
//   variation B: 1,198 decision events, 112 cta_click → 9.3%`;

const DECLARATIVE_SNIPPET = `<!-- A listener turns data attributes into events - no JS per element.
     The attribute names are yours to choose; the pattern is what matters. -->

<!-- Click tracking -->
<a href="/savings" data-track-event="cta_click" data-track-tags='{"area":"hero"}'>
  Open an account
</a>

<!-- Accordion opens -->
<div data-track-toggle="faq_open">
  <details><summary>What are the fees?</summary>...</details>
</div>

<!-- Form submits -->
<div data-track-submit="contact_submit">
  <form>...</form>
</div>

<!-- Fired automatically, no attributes needed:
     outbound_click - clicks on external links
     scroll_depth   - 25 / 50 / 75 / 100% scroll marks
     time_on_page   - 30 / 60 / 180 second marks -->`;

export default function EventTrackingDemoPage() {
  return (
    <>
      <DemoHero
        title="Event Tracking"
        description={<>A global tracking layer: one{" "}
          <code className="bg-on-brand/10 px-1 rounded font-mono text-sm">trackEvent()</code> wrapper
          fans conversion events out to Feature Experimentation, ODP, and any other destination -
          closing the decision-to-conversion loop for experiments.</>}
      />

      <div className="max-w-7xl mx-auto px-8 py-16 space-y-20">

        <section id="live">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Live demo
            <SectionAnchor id="live" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-4 max-w-3xl leading-relaxed">
            The button fires a <code className="bg-surface-low px-1 rounded font-mono text-xs">cta_click</code>{" "}
            conversion through the tracking layer. The dispatch log below shows each event and which
            destinations received it - scroll the page and the automatic{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">scroll_depth</code> events
            appear in the same log, because they flow through the same wrapper.
          </p>
          <ConversionDemo />
        </section>

        <section id="layer">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            One wrapper, many destinations
            <SectionAnchor id="layer" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            Analytics calls scattered through components couple every feature to every vendor. The
            tracking layer inverts that: components call a single{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">trackEvent(key, tags)</code>{" "}
            and the layer resolves the visitor identity once - the same{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code>{" "}
            cookie every Optimizely product keys off - then fans the event out to every registered
            destination. Three is the usual set: the experimentation browser client, the data
            platform tag, and a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">window.dataLayer</code> push
            for whatever analytics and tag manager the business already runs. That
            third destination is the reason a customer&apos;s existing analytics can slice by
            experiment arm without a second integration: every event carries{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">exp_variant_string</code>,
            so an Optimizely variation shows up as a dimension in reports Optimizely does not own.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <CodeBlock code={DESTINATION_SNIPPET} label="The destination contract and fan-out" />
            <CodeBlock code={ADD_DESTINATION_SNIPPET} label="Adding a new source" />
          </div>
        </section>

        <section id="loop">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            The decision-to-conversion loop
            <SectionAnchor id="loop" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            An A/B test needs two events tied to the same visitor: a <strong>decision event</strong>{" "}
            (this user saw variation B) and a <strong>conversion</strong> (this user then did the thing
            we care about). This project suppresses decision events at decide time with{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">DISABLE_DECISION_EVENT</code>{" "}
            - middleware and server components decide flags several times per request, and firing on
            every decide would double-count. Only the component that renders the variation fires the
            decision event. Conversions then attribute correctly because the tracking layer uses the same
            stable visitor ID for <code className="bg-surface-low px-1 rounded font-mono text-xs">trackEvent</code>{" "}
            that middleware used for bucketing.
          </p>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            The visitor ID is no longer the only thread. Every event also carries{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">exp_variant_string</code>,
            naming the variations on screen when it fired, which is what lets ODP and GA4 segment by
            arm rather than only FX. Getting that right needed one piece of coordination: an
            above-the-fold component beats the network. A hero&apos;s view event can fire within
            milliseconds of mount, while the SDK still has to fetch its datafile before it can
            decide anything - so the most valuable decision event on the page is exactly the one most
            likely to go out unattributed. The fix is for{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">trackEvent</code> to wait
            for decisions to settle before building the event. Keep that wait bounded and let it
            return early once decisions stop arriving: it should delay an event, never drop one. A
            page that serves no variation waits once and then sends no tag at all.
          </p>
          <CodeBlock code={CONVERSION_LOOP_SNIPPET} label="Decision-event suppression and conversion attribution" />
        </section>

        <section id="declarative">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            Declarative auto-tracking
            <SectionAnchor id="declarative" label="#" />
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 max-w-3xl leading-relaxed">
            A single listener (mounted
            once in the root layout) listens for clicks, toggles, submits, and scrolling with document-level
            listeners, so most events need no component code at all - a{" "}
            <code className="bg-surface-low px-1 rounded font-mono text-xs">data-track-event</code>{" "}
            attribute is enough. Because that listener calls the same wrapper, every destination gets these
            events too.
          </p>
          <CodeBlock code={DECLARATIVE_SNIPPET} label="A declarative attribute contract" />
        </section>

        <section id="setup">
          <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
            FX setup: the event key must exist
            <SectionAnchor id="setup" label="#" />
          </h2>
          <div className="bg-surface-lowest rounded-2xl p-5 border border-ghost-border">
            <p className="text-xs font-mono font-semibold text-on-surface mb-2">Silently dropped otherwise</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Feature Experimentation only accepts events whose key is defined in the FX project -{" "}
              <code className="bg-surface px-1 rounded font-mono">trackEvent</code> calls with unknown
              keys are dropped without an error. Create the event in the FX UI (or via the
              Optimizely Experimentation MCP server), then attach it as a metric to a flag rule so
              results accumulate per variation. Like CMS Variations, this is a one-time manual setup
              step per project. The ODP and dataLayer destinations have no such registry - they accept
              any key.
            </p>
          </div>
        </section>

        <KeyPoints points={[
          <><strong className="text-on-surface">Components call one wrapper, never a vendor SDK.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">trackEvent(key, tags)</code> resolves identity once and fans out to all destinations - adding a vendor is one <code className="bg-surface-low px-1 rounded font-mono text-xs">TrackingDestination</code> object, zero call-site changes.</>,
          <><strong className="text-on-surface">Tracking must never break the page.</strong> Every destination send is isolated in its own try/catch; a failing or missing sink (ODP without the zaius script) reports <em>skipped</em> or <em>error</em> and the rest still deliver.</>,
          <><strong className="text-on-surface">Decision events and conversions must share a visitor ID.</strong> Both use the <code className="bg-surface-low px-1 rounded font-mono text-xs">optimizelyEndUserId</code> cookie set by middleware - a fresh UUID per request would make conversions unattributable.</>,
          <><strong className="text-on-surface">Every event names the variation it was fired under.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">exp_variant_string</code> travels to all three destinations, so ODP and GA4 can segment by experiment arm, not just FX. Use the <strong>rule</strong> key rather than the flag key - a flag can have several rules, and the rule is what the analytics tool&apos;s experiment dimension expects.</>,
          <><strong className="text-on-surface">Suppress decision events at decide time, fire at render time.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">DISABLE_DECISION_EVENT</code> everywhere except the component that renders the variation prevents double-counting.</>,
          <><strong className="text-on-surface">FX drops events with unknown keys - silently.</strong> Define the event in the FX project and attach it as a metric to a flag rule before expecting results.</>,
          <><strong className="text-on-surface">Prefer declarative tracking for content.</strong> <code className="bg-surface-low px-1 rounded font-mono text-xs">data-track-event</code> attributes work inside CMS-rendered markup where you can&apos;t add click handlers.</>,
        ]} />

        <SourcePanel
          heading="How this reference implementation does it"
          files={[
            { label: "tracking/index.ts", path: "src/lib/tracking/index.ts", content: trackingIndexTs },
            { label: "destinations/fx.ts", path: "src/lib/tracking/destinations/fx.ts", content: fxDestinationTs },
            { label: "destinations/odp.ts", path: "src/lib/tracking/destinations/odp.ts", content: odpDestinationTs },
            { label: "destinations/dataLayer.ts", path: "src/lib/tracking/destinations/dataLayer.ts", content: dataLayerDestinationTs },
            { label: "activeVariations.ts", path: "src/lib/tracking/activeVariations.ts", content: activeVariationsTs },
            { label: "AutoTracker.tsx", path: "src/components/AutoTracker.tsx", content: autoTrackerTs },
            { label: "ConversionDemo.tsx", path: "src/app/demo/event-tracking/ConversionDemo.tsx", content: conversionDemoTs },
          ]}
        />

      </div>
    </>
  );
}
