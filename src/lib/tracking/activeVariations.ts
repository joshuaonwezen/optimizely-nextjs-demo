"use client";

// Variations the visitor is looking at right now, keyed by FX rule key.
//
// Written only by <FxBucketingEvent>, which mounts exclusively where a component
// has already rendered a variation and fired its impression, so this map can never
// claim a variation that was not served. Nothing here calls decide() - it only
// reports a decision that already happened.
//
// Entries are dropped on unmount. That is what stops a flag served on one page from
// tagging events on the next one after a client-side navigation.
const active = new Map<string, string>();

// When the map last changed, used to detect that decisions have stopped arriving.
let lastRecordedAt = 0;

export function recordVariation(ruleKey: string, variationKey: string): void {
  active.set(ruleKey, variationKey);
  lastRecordedAt = Date.now();
}

export function clearVariation(ruleKey: string): void {
  active.delete(ruleKey);
}

export function getActiveVariations(): Record<string, string> {
  return Object.fromEntries(active);
}

// GA4's multi-experiment convention, matching scripts/send-ga4-events.mjs
// (pickExpVariantString) exactly: RuleKey-VariationName, comma-joined. Seeded
// history and runtime events therefore share one vocabulary and one custom
// dimension. Sorted so the value is stable no matter which component mounted first.
//
// Returns "" when no variation is served. Callers must omit the param entirely in
// that case rather than send it blank, which is what the seeder does too.
export function serializeVariations(): string {
  return [...active.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ruleKey, variationKey]) => `${ruleKey}-${variationKey}`)
    .join(",");
}

// Hard ceiling on how long an event waits for FX. A blocked datafile CDN must never
// hold events indefinitely.
const SETTLE_TIMEOUT_MS = 1500;
// After the client is ready, how long to keep accepting late decisions. Covers the
// full mount chain below, which is several ticks, not one.
const GRACE_MS = 250;
// Once decisions are arriving, treat a gap this long as "that was all of them".
const QUIET_MS = 80;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let clientReady: Promise<void> | null = null;

/**
 * Resolves once FX decisions have had their chance to land.
 *
 * Needed because above-the-fold components race the network. Measured on the homepage:
 * HeroBlock's IntersectionObserver fires mb_feature_viewed at ~11ms, while the browser
 * SDK cannot decide until it has fetched the datafile (~229ms cold). So the hero
 * impression, the one whose variation matters most, was the single event going out
 * unattributed.
 *
 * Waiting on the SDK client alone is NOT enough, and that mistake is easy to repeat:
 * <FxBucketingEvent> does not mount when the client is ready, it mounts after
 * useFxDecision resolves and re-renders its parent, which is a couple of ticks later
 * still. So the chain is client ready -> useFxDecision setState -> re-render ->
 * FxBucketingEvent effect -> decide() -> recordVariation(). Hence a grace window
 * rather than a microtask hop.
 *
 * Returns as soon as decisions stop arriving (QUIET_MS of no change), so the common
 * path costs far less than the full window. A page that serves no variation at all
 * waits GRACE_MS once and then proceeds untagged, which is correct.
 *
 * Never rejects and never drops an event: the worst case is a bounded delay.
 */
export function whenVariationsSettled(): Promise<void> {
  clientReady ??= import("@/lib/optimizely/browser-client")
    .then(({ getOptimizelyBrowserClient }) => getOptimizelyBrowserClient())
    .then(() => undefined)
    .catch(() => undefined);

  return Promise.race([wait(SETTLE_TIMEOUT_MS), settle()]);
}

async function settle(): Promise<void> {
  await clientReady;
  const deadline = Date.now() + GRACE_MS;
  for (;;) {
    const now = Date.now();
    if (now >= deadline) return;
    if (lastRecordedAt > 0 && now - lastRecordedAt >= QUIET_MS) return;
    await wait(Math.min(20, deadline - now));
  }
}
