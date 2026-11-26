/**
 * Sends fake traffic to Optimizely Feature Experimentation (FX), Web
 * Experimentation (WX) and the Optimizely Data Platform (ODP) so the dashboards look
 * like a real, busy bank site for demos. It is the FX/ODP sibling of scripts/send-ga4-events.mjs and is
 * meant to run on the same daily schedule (see .github/workflows/experiment-odp-seed.yml).
 *
 * What it produces
 *   FX  - real impressions (via ctx.decide, so variation splits come from the
 *         live datafile's traffic allocation, not faked) plus the events a real
 *         session fires (ctx.trackEvent), with the same keys and tags the site
 *         sends. Everything is DISCOVERED from the live datafile at runtime: the
 *         running experiments, and each experiment's metrics (the datafile lists,
 *         per event, the experiments it is attached to). A metric added in the FX
 *         console therefore gets data from the next run, with no code change.
 *         About half the experiments get a designed winner whose variation lifts
 *         that experiment's metrics; the rest stay flat - the "mixed" story.
 *         A CONTENT TEST (a page against a CMS variation of it, made by the FX
 *         Experiments CMS extension) is different: each published version of its
 *         variation gets an effect of its own, so the numbers move when Mark
 *         rewrites the variation. See "Content tests" below.
 *   WX  - a decision (impression) for each running WX experiment the visitor's
 *         pages put them in, and for each personalization campaign the experience
 *         of the first audience they match (or its holdback), sent to the Event API. WX experiments measure FX events
 *         (cross-project events, same account and same visitor id), so their
 *         conversions are the FX events above; a WX winner lifts them the same way.
 *         Experiment ids come from scripts/wx-project-ids.json (written by
 *         scripts/seed-wx-project.ts); an experiment counts as running when the public
 *         snippet holds it, since the project excludes paused ones from the snippet.
 *   ODP - pageviews to business/personal sections (what realtime audiences key
 *         on), every event the visitor fired (the FX ones plus the analytics-only
 *         ones FX does not define, such as customer_identified), and - for a minority of
 *         visitors - a known-customer identify so the business/personal audiences
 *         and homepage personalization populate.
 *
 * The same synthetic visitor feeds every sink, so the datasets stay consistent
 * (whoever converts in FX shows the matching funnel in ODP) - this mirrors how
 * the app's trackEvent() fans out to fx + odp at runtime.
 *
 * Usage:
 *   npm run exp:seed                 send a day of fake FX + ODP traffic
 *   npm run exp:seed -- --dry-run    build everything, print the realized
 *                                    variation + conversion distribution, send
 *                                    nothing (also accepts --debug)
 *   npm run exp:seed -- --users=100  override the number of synthetic visitors
 *   npm run exp:seed -- --only=fx    seed only FX + WX (or --only=odp)
 *   npm run exp:seed -- --no-wx      leave the WX decisions out
 *
 * Credentials are read from .env.local (or GitHub Actions secrets in CI):
 *   OPTIMIZELY_FX_SDK_KEY   datafile at cdn.optimizely.com/datafiles/<key>.json
 *   OPTIMIZELY_ODP_API_KEY  x-api-key for the ODP REST event API
 *   OPTIMIZELY_ODP_API_HOST defaults to https://api.zaius.com
 *   MARK_TOOLS_BEARER       optional: the site's Mark tools token. With it the seeder
 *                           asks the site which version of each content test's
 *                           variation is live. Without it, or when the site cannot be
 *                           reached, content tests keep the fixed per-flag story.
 *   MARK_TOOLS_URL          the site to ask. Defaults to the live site.
 *
 * Notes / limits
 *   - Unlike GA4's Measurement Protocol, FX SDK events and ODP events are stamped
 *     at ingest time and cannot be meaningfully backdated, so history BUILDS
 *     FORWARD as the daily cron accumulates runs (no instant backfill).
 *   - Only flags with a RUNNING experiment in the live datafile get seeded. A
 *     flag that is only a targeted delivery has no result to show, so it is
 *     skipped. An event no experiment uses as a metric is still sent when it is
 *     part of a normal session (scroll depth, time on page, ...).
 *   - The endpoints accept writes and return success regardless of whether the
 *     key is correct, so a green run is not proof by itself; verify in the FX and
 *     WX Results dashboards and via scripts/maintenance/test-odp.ts.
 *   - FX events go through a fetch dispatcher, not the SDK's default. SDK 6.4.0's
 *     Node request sets content-length to the body's character count, so any batch
 *     holding a non-ASCII tag ("Switch and get £150") was cut short and rejected
 *     with a 400 - about 17 batches a day.
 */

import { readFileSync } from "node:fs";
import { config } from "dotenv";
import {
  createBatchEventProcessor,
  createInstance,
  createStaticProjectConfigManager,
  createLogger,
  OptimizelyDecideOption,
  ERROR,
} from "@optimizely/optimizely-sdk";

config({ path: ".env.local" });

const FX_SDK_KEY = process.env.OPTIMIZELY_FX_SDK_KEY;
const ODP_API_HOST = process.env.OPTIMIZELY_ODP_API_HOST ?? "https://api.zaius.com";
const ODP_API_KEY = process.env.OPTIMIZELY_ODP_API_KEY ?? "";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("--debug");
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
const NUM_USERS = Number(getArg("users", 400));
// --only=fx or --only=odp restricts which sink is seeded (default: both).
const ONLY = getArg("only", "both");
const SEED_FX = ONLY !== "odp";
const SEED_ODP = ONLY !== "fx";
// WX decisions only mean something next to the FX conversions they are measured by.
const SEED_WX = SEED_FX && !args.includes("--no-wx");
const WX_IDS_FILE = "scripts/wx-project-ids.json";
const LOGX_URL = "https://logx.optimizely.com/v1/events";
const WX_BATCH_VISITORS = 50;

const BATCH_DELAY_MS = 60;
// The site hostname. It is passed as the FX `hostname` attribute and used in the
// ODP page URLs. It MUST match the audience that gates the live experiments
// (the "Main demo site" audience keys on hostname containing this value) - send
// any other host and every user fails the audience and buckets to "off".
const HOSTNAME = "optimizely-onboarding.vercel.app";
const KNOWN_CUSTOMER_RATE = 0.2; // ~20% of visitors are identified as known customers
const MOBILE_RATE = 0.55;
const MARK_TOOLS_URL = (process.env.MARK_TOOLS_URL ?? `https://${HOSTNAME}`).replace(/\/+$/, "");
const MARK_TOOLS_BEARER = process.env.MARK_TOOLS_BEARER ?? "";
// Visitors per variation that a content test's effect should be readable at: a little
// over a week of this job's traffic for one test.
const VISITORS_TO_READ = 9000;

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const chance = (p) => Math.random() < p;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Weighted pick over items carrying a numeric `weight` field.
function pickWeighted(arr) {
  const total = arr.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;
  for (const item of arr) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return arr[arr.length - 1];
}

// Stable string hash so the "winner vs flat" assignment and lifts are
// deterministic per flag (the demo story does not reshuffle between runs).
function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Which part of the bank the visitor is interested in. `path` seeds the ODP
// pageviews (business vs personal paths are what the realtime audiences key on);
// `persona` is the FX attribute the persona audiences match (null = not sent, as
// for a visitor the site has no persona for); `accountType` tags identified customers.
const SECTIONS = [
  { persona: "personal",    path: "/personal",                  weight: 40, accountType: "personal", category: "savings" },
  { persona: "business",    path: "/business/business-banking", weight: 20, accountType: "business", category: "business-banking" },
  { persona: "mortgages",   path: "/mortgage",                  weight: 18, accountType: "personal", category: "mortgages" },
  { persona: "investments", path: "/investments",               weight: 12, accountType: "personal", category: "investing" },
  { persona: null,          path: "",                           weight: 10, accountType: "personal", category: "news" },
];

const FIRST_NAMES = ["Emma", "Liam", "Sophie", "Daan", "Noah", "Julia", "Lucas", "Mila", "James", "Sara", "Finn", "Ava"];
const LAST_NAMES = ["de Vries", "Jansen", "Smith", "Bakker", "Visser", "Brown", "Meijer", "Jones", "Mulder", "Taylor"];
const PRODUCTS = ["Everyday Checking", "Easy Saver", "Premier Account", "Business Checking", "Fixed Rate Mortgage", "Stocks & Shares ISA"];
const FORMS = ["contact_form", "opti_form"];

// How often a session fires each event the site tracks, and the tags it carries
// (same names as the site's data-track-tags / trackEvent calls). Rates are per
// visitor before any experiment lift. Events missing here are not part of a normal
// session (the demo-panel events); one that an experiment uses as a metric falls
// back to DEFAULT_METRIC_RATE so its experiment still gets data.
const EVENT_PROFILES = {
  cta_click: { rate: 0.09, tags: () => ({ label: pick(["Open an account", "Get started", "Compare accounts", "Book an appointment", "Apply now"]), variant: pick(["primary", "ghost"]) }) },
  hero_cta_click: { rate: 0.11, tags: () => ({ label: pick(["Open an account", "Find your mortgage", "Start investing", "See how it works"]), placement: pick(["primary", "primary", "secondary"]) }) },
  product_card_click: { rate: 0.07, tags: () => ({ title: pick(PRODUCTS), featured: chance(0.3) }) },
  product_spotlight_click: { rate: 0.03, tags: () => ({ product: pick(PRODUCTS) }) },
  product_hero_cta_click: { rate: 0.06, tags: () => ({ label: pick(["Apply now", "Open an account", "Learn More"]) }) },
  pricing_tier_click: { rate: 0.05, tags: () => { const tier = pick(["Essential", "Plus", "Premier"]); return { tier, label: "Choose plan", highlighted: tier === "Plus" }; } },
  campaign_banner_click: { rate: 0.03, tags: () => ({ heading: pick(["Switch and get £150", "Mortgage rates from 3.9%", "Earn 5.10% AER"]), color: pick(["#0037ff", "#0b7a75", "#1a1a2e"]) }) },
  nav_click: { rate: 0.32, tags: () => ({ source: pick(["header", "header", "footer"]) }) },
  outbound_click: { rate: 0.04, tags: () => ({ href: pick(["https://apps.apple.com/app/mosey-bank", "https://play.google.com/store/apps/details?id=bank.mosey", "https://www.fdic.gov/"]), label: pick(["App Store", "Google Play", "FDIC"]) }) },
  faq_expand: { rate: 0.12, tags: () => ({ label: pick(["How do I open an account?", "Is my money protected?", "What are your mortgage rates?", "How long does a transfer take?"]) }) },
  feature_viewed: { rate: 0.6, tags: () => { const component = pick(["HeroBlock", "CallToActionBlock", "ProductHeroBlock", "CampaignBannerBlock", "SpotlightBlock"]); return { component, label: component, depth: pick([50, 100]) }; } },
  content_viewed: { rate: 0.25, tags: (s) => ({ categories: s.category, primary_category: s.category }) },
  segment_qualified: { rate: 0.1, tags: (s) => ({ segment: s.persona ?? "general" }) },
  // Clicks on something only some variations render (see SHOWN_BY).
  banner_click: { rate: 0.04, tags: (s, served) => ({ variation: served.get("banner") }) },
  rates_bar_click: { rate: 0.12, tags: () => ({ product: "savings", apy: "4.75%" }) },
  offer_bar_click: { rate: 0.1, tags: (s, served) => ({ offer: served.get("sticky_offer_bar"), label: served.get("sticky_offer_bar") === "savings_rate" ? "Open an Easy Saver" : "Learn more" }) },
};
// Events that can only happen when the visitor was served a variation that renders
// the element, so a control visitor never "clicks" a bar they were not shown.
const SHOWN_BY = {
  banner_click: { flag: "banner", shown: (v) => !!v && v !== "off" },
  rates_bar_click: { flag: "rates_bar", shown: (v) => v === "treatment" },
  offer_bar_click: { flag: "sticky_offer_bar", shown: (v) => !!v && v !== "off" && v !== "control" },
};
const DEFAULT_METRIC_RATE = 0.08;
// Max probability after lifts, so stacked winners never make an event near-certain.
const RATE_CAP = 0.85;

// Turn a running flag (its experiments' variations and metrics) into a plan: whether
// it has a designed winner, which variation wins and by how much. About half of the
// flags (by hash) get a winner; the rest stay flat / inconclusive. The baseline is
// the experiment's first variation, so the winner is always a challenger.
// `decreasing` lists the metrics where lower is better: the winner lowers those.
function buildPlan(flagKey, variationKeys, metrics, decreasing = []) {
  const h = hash(flagKey);
  const challengers = variationKeys.slice(1);
  const isWinner = h % 2 === 0 && challengers.length > 0;
  const winner = isWinner ? challengers[h % challengers.length] : null;
  const lift = 1.25 + (h % 4) * 0.1; // 1.25 .. 1.55
  return { flagKey, variationKeys, metrics, decreasing: new Set(decreasing), isWinner, winner, lift };
}

// ── Content tests: each published version of a variation gets its own effect ──
//
// A content test compares a page with a CMS variation of it, and Mark rewrites the
// variation when it is not winning. An outcome fixed per flag would look the same
// whatever the variation says, so here the effect belongs to the VERSION of the
// variation that is live: stable from run to run, and drawn again after a rewrite.
//   - A variation's first version trails the original. That is what gets the first
//     rewrite written.
//   - After that, three rewrites in four beat the original and one in four trails it.
// Results are cumulative, so a test's verdict follows a rewrite with a delay.

// How big a relative change has to be for about a week of this job's traffic to tell
// two versions apart, taken from the test's rarest metric: a 3% click needs a far
// bigger change than a 30% one at the same visitor count. About 3.5 standard errors.
function readableEffect(metrics) {
  const rates = metrics.map((key) => EVENT_PROFILES[key]?.rate ?? DEFAULT_METRIC_RATE);
  const rate = rates.length > 0 ? Math.min(...rates) : DEFAULT_METRIC_RATE;
  const size = 3.5 * Math.sqrt((2 * (1 - rate)) / (rate * VISITORS_TO_READ));
  return Math.min(0.45, Math.max(0.08, size));
}

function versionEffect(flagKey, variation, version, timesPublished, size) {
  const h = hash(`${flagKey}:${variation}:${version}`);
  const spread = 0.8 + (h % 9) * 0.1; // 0.8 .. 1.6 of the readable size
  const trails = timesPublished <= 1 || (h >>> 4) % 4 === 0;
  return trails ? 1 - size * Math.min(spread, 1.1) : 1 + size * spread;
}

// The site's list of content tests (the Mark tool mosey_list_experiments): for each
// flag, the live version of each variation. Empty when it cannot be read, which
// leaves those flags to buildPlan().
async function loadContentTests() {
  const none = new Map();
  if (!MARK_TOOLS_BEARER) {
    console.warn("⚠ MARK_TOOLS_BEARER is not set - content tests keep their fixed per-flag story.");
    return none;
  }
  try {
    const res = await fetch(`${MARK_TOOLS_URL}/api/mark/tools/mosey-list-experiments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${MARK_TOOLS_BEARER}` },
      body: JSON.stringify({ parameters: { max_pages: 25 } }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = res.ok ? await res.json() : null;
    if (!Array.isArray(body?.tests)) {
      console.warn(`⚠ Could not read the content tests from ${MARK_TOOLS_URL} (HTTP ${res.status}${body?.error ? `: ${body.error}` : ""}). They keep their fixed per-flag story.`);
      return none;
    }
    const byFlag = new Map();
    for (const test of body.tests) {
      const live = (test.variations ?? []).filter((v) => v.publishedVersion);
      if (test.status === "running" && test.flagKey && live.length > 0) {
        byFlag.set(test.flagKey, new Map(live.map((v) => [v.name, v])));
      }
    }
    return byFlag;
  } catch (error) {
    console.warn(`⚠ Could not reach ${MARK_TOOLS_URL} for the content tests (${error?.message ?? error}). They keep their fixed per-flag story.`);
    return none;
  }
}

function buildVersionPlan(flagKey, variationKeys, metrics, versions) {
  const size = readableEffect(metrics);
  const effects = new Map();
  for (const [variation, { publishedVersion, timesPublished }] of versions) {
    if (!variationKeys.includes(variation)) continue;
    effects.set(variation, {
      version: publishedVersion,
      factor: versionEffect(flagKey, variation, publishedVersion, timesPublished ?? 1, size),
    });
  }
  return { flagKey, variationKeys, metrics, decreasing: new Set(), isWinner: false, winner: null, lift: 1, effects };
}

/** A plan's effect on one event for a visitor served `variation`. */
function planLift(plan, variation, key) {
  if (plan.effects) return plan.metrics.includes(key) ? (plan.effects.get(variation)?.factor ?? 1) : 1;
  const wins = plan.winners ? plan.winners.has(variation) : plan.winner === variation;
  if (!wins || !plan.metrics.includes(key)) return 1;
  return plan.decreasing.has(key) ? 1 / plan.lift : plan.lift;
}

// ── ODP REST helpers (same endpoint + auth as src/app/api/form-submit/route.ts) ──

async function sendOdpEvents(events) {
  const res = await fetch(`${ODP_API_HOST}/v3/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
    body: JSON.stringify(events),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, text };
  }
  return { ok: true };
}

// Upsert a customer profile so attribute-based audiences (and the CMS
// personalization demo) can qualify the visitor. The /v3/profiles endpoint may
// not be enabled on every ODP account, so a failure here only warns - the
// pageview-path signal is the primary audience trigger.
async function upsertOdpProfile(identifiers, attributes) {
  try {
    const res = await fetch(`${ODP_API_HOST}/v3/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ODP_API_KEY },
      body: JSON.stringify({ identifiers, attributes }),
    });
    if (!res.ok) return { ok: false, status: res.status, text: await res.text().catch(() => "") };
    return { ok: true };
  } catch (err) {
    return { ok: false, status: 0, text: String(err) };
  }
}

// ── FX client (same datafile source as src/lib/optimizely/experimentation.ts) ──

// Replaces the SDK's default dispatcher, whose content-length is the body's character
// count rather than its byte count (see the header). fetch sizes the body itself.
const fxDispatch = { batches: 0, failed: 0, lastError: "", inFlight: new Set() };
const fxEventDispatcher = {
  dispatchEvent(event) {
    const p = dispatch(event).finally(() => fxDispatch.inFlight.delete(p));
    fxDispatch.inFlight.add(p);
    return p;
  },
};
async function dispatch({ url, httpVerb, params }) {
  fxDispatch.batches++;
  try {
    const res = await fetch(url, { method: httpVerb, headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
    if (!res.ok) {
      fxDispatch.failed++;
      fxDispatch.lastError = `HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`;
    }
    return { statusCode: res.status };
  } catch (err) {
    fxDispatch.failed++;
    fxDispatch.lastError = String(err);
    return {};
  }
}

// close() resolves before the processor's last batches are dispatched, so wait until
// no dispatch has been in flight for a couple of seconds.
async function settleFxDispatches() {
  for (let idle = 0; idle < 4; ) {
    await sleep(500);
    idle = fxDispatch.inFlight.size === 0 ? idle + 1 : 0;
  }
}

async function buildFx(contentTests) {
  const res = await fetch(`https://cdn.optimizely.com/datafiles/${FX_SDK_KEY}.json`, { cache: "no-store" });
  if (!res.ok) {
    console.error(`Could not fetch the FX datafile (HTTP ${res.status}). Check OPTIMIZELY_FX_SDK_KEY.`);
    process.exit(1);
  }
  const datafileText = await res.text();
  const datafile = JSON.parse(datafileText);
  const eventKeys = (datafile.events ?? []).map((e) => e.key);
  // The SDK has no event processor unless one is passed, and without it every
  // impression and conversion is silently dropped. The bulk loop enqueues tens of
  // thousands of events, so batch them; close() flushes the rest.
  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile: datafileText }),
    logger: createLogger({ level: ERROR }),
    eventProcessor: createBatchEventProcessor({ batchSize: 100, flushInterval: 2000, eventDispatcher: fxEventDispatcher }),
  });
  if (!client) {
    console.error("Failed to create the FX SDK client from the datafile.");
    process.exit(1);
  }
  await client.onReady();

  // A flag is seeded when it has a running experiment. Its metrics are the events
  // the datafile attaches to any of those experiments.
  const running = new Map((datafile.experiments ?? []).filter((e) => e.status === "Running").map((e) => [e.id, e]));
  const plans = [];
  for (const flag of datafile.featureFlags ?? []) {
    const experiments = (flag.experimentIds ?? []).map((id) => running.get(id)).filter(Boolean);
    if (experiments.length === 0) continue;
    const ids = new Set(experiments.map((e) => e.id));
    const variationKeys = [...new Set(experiments.flatMap((e) => e.variations.map((v) => v.key)))];
    const metrics = (datafile.events ?? []).filter((e) => (e.experimentIds ?? []).some((id) => ids.has(id))).map((e) => e.key);
    const versions = contentTests.get(flag.key);
    plans.push(versions ? buildVersionPlan(flag.key, variationKeys, metrics, versions) : buildPlan(flag.key, variationKeys, metrics));
  }
  return { client, plans, eventKeys };
}

// ── WX experiments (ids from scripts/wx-project-ids.json, running = in the snippet) ──

async function loadWx() {
  let ids;
  try {
    ids = JSON.parse(readFileSync(WX_IDS_FILE, "utf8"));
  } catch {
    console.warn(`⚠ ${WX_IDS_FILE} not found - run scripts/seed-wx-project.ts. Skipping WX.`);
    return null;
  }
  const res = await fetch(`https://cdn.optimizely.com/js/${ids.projectId}.js`, { cache: "no-store" });
  if (!res.ok) {
    console.warn(`⚠ Could not fetch the WX snippet (HTTP ${res.status}). Skipping WX.`);
    return null;
  }
  const snippet = await res.text();
  const decreasing = (metrics) => metrics.filter((m) => m.direction === "decreasing").map((m) => m.key);
  const plans = ids.experiments
    .filter((e) => snippet.includes(`"${e.experimentId}"`))
    .map((e) => ({ ...buildPlan(e.key, e.variations.map((v) => v.key), e.metrics.map((m) => m.key), decreasing(e.metrics)), wx: e }));
  // Personalization: every experience beats the holdback (personalizing works), so
  // the story is in how much each one lifts, not in which one wins.
  const campaigns = (ids.campaigns ?? [])
    .filter((c) => snippet.includes(`"${c.campaignId}"`))
    .map((c) => {
      const keys = c.experiences.map((x) => x.key);
      return { ...buildPlan(c.key, ["holdback", ...keys], c.metrics.map((m) => m.key), decreasing(c.metrics)), winners: new Set(keys), campaign: c };
    });
  return { ids, plans, campaigns };
}

// Which audiences a synthetic visitor is in, by the spec's audience keys.
function inAudience(audience, visitor) {
  if (audience === "mobile") return visitor.device === "mobile";
  if (audience === "loggedIn") return visitor.loggedIn;
  if (audience === "mortgages") return visitor.persona === "mortgages";
  return false;
}

// One visitor's decisions as an Event API visitor. The attributes let WX results be
// segmented the way WxProfileBridge sends them.
function wxVisitor(ids, visitorId, decisions, attrs, timestamp) {
  const attributes = Object.entries(attrs)
    .filter(([key, value]) => ids.attributes[key] && value !== undefined && value !== null)
    .map(([key, value]) => ({ entity_id: ids.attributes[key], key, type: "custom", value: String(value) }));
  return {
    visitor_id: visitorId,
    attributes,
    snapshots: [
      {
        decisions: decisions.map((d) => ({ campaign_id: d.campaignId, experiment_id: d.experimentId, variation_id: d.variationId, is_campaign_holdback: !!d.holdback })),
        events: decisions.map((d) => ({ entity_id: d.campaignId, type: "campaign_activated", timestamp, uuid: crypto.randomUUID() })),
      },
    ],
  };
}

async function sendWx(ids, visitors) {
  const res = await fetch(LOGX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      account_id: ids.accountId,
      project_id: ids.projectId,
      visitors,
      anonymize_ip: true,
      client_name: "mosey-demo-seeder",
      client_version: "1.0.0",
      enrich_decisions: true,
    }),
  });
  return res.ok ? { ok: true } : { ok: false, status: res.status, text: await res.text().catch(() => "") };
}

// ── Distribution tally for the dry-run / summary report ──

// stats[flagKey] = { impressions: {variation: n}, conversions: {variation: {event: n}} }
const stats = {};
function record(plan, variation, fired) {
  const s = (stats[plan.flagKey] ??= { impressions: {}, conversions: {} });
  s.impressions[variation] = (s.impressions[variation] ?? 0) + 1;
  const conv = (s.conversions[variation] ??= {});
  for (const key of plan.metrics) if (fired.has(key)) conv[key] = (conv[key] ?? 0) + 1;
}

function printReport(plans) {
  console.log("\nExperiment distribution (share of visitors who fired each metric):");
  for (const plan of plans) {
    const s = stats[plan.flagKey];
    if (!s) continue;
    const tag = plan.effects
      ? `content test: ${[...plan.effects].map(([v, e]) => `${v} v${e.version} x${e.factor.toFixed(2)}`).join(", ") || "no live variation"}`
      : plan.winners
      ? `every experience beats holdback x${plan.lift.toFixed(2)}`
      : plan.isWinner
        ? `winner: ${plan.winner} x${plan.lift.toFixed(2)}`
        : "flat";
    const metrics = plan.metrics.map((key) => (plan.decreasing.has(key) ? `${key} (lower is better)` : key));
    console.log(`\n  ${plan.campaign ? "WX personalization " : plan.wx ? "WX " : ""}${plan.flagKey}  (${tag}, metrics: ${metrics.join(", ") || "none"})`);
    for (const variation of Object.keys(s.impressions).sort()) {
      const imp = s.impressions[variation];
      const rates = plan.metrics
        .map((key) => `${key} ${(((s.conversions[variation]?.[key] ?? 0) / imp) * 100).toFixed(1)}%`)
        .join("  ");
      const star = (plan.winners ? plan.winners.has(variation) : plan.winner === variation) ? " *" : "";
      console.log(`    ${variation.padEnd(16)} ${String(imp).padStart(5)} imp  ${rates}${star}`);
    }
  }
}

// ── Preflight: fail loudly on bad credentials before the main loop ──

async function preflight(plans, wx) {
  if (SEED_FX) {
    if (!plans || plans.length === 0) {
      console.warn(
        "⚠ No running FX experiments found in the datafile - nothing to seed for FX.\n" +
          "  Start the experiments in the FX console (or pass --only=odp)."
      );
    } else {
      console.log(`FX: driving ${plans.length} running experiment(s): ${plans.map((p) => p.flagKey).join(", ")}`);
    }
  }
  if (SEED_WX && wx) {
    if (wx.plans.length === 0) console.warn("⚠ No running WX experiments in the snippet - nothing to seed for WX.");
    else console.log(`WX: driving ${wx.plans.length} running experiment(s): ${wx.plans.map((p) => p.flagKey).join(", ")}`);
    if (wx.campaigns.length > 0) console.log(`WX: driving ${wx.campaigns.length} personalization campaign(s): ${wx.campaigns.map((p) => p.flagKey).join(", ")}`);
  }
  if (SEED_ODP) {
    if (!ODP_API_KEY) {
      console.error("Error: OPTIMIZELY_ODP_API_KEY must be set to seed ODP (or pass --only=fx).");
      process.exit(1);
    }
    const res = await sendOdpEvents([
      { type: "pageview", action: "pageview", identifiers: { fs_user_id: `preflight-${Date.now()}` }, data: { page: `https://${HOSTNAME}/` } },
    ]);
    if (!res.ok && (res.status === 401 || res.status === 403 || res.status === 400)) {
      console.error(`ODP preflight failed: HTTP ${res.status} ${res.text}. Check OPTIMIZELY_ODP_API_KEY / HOST.`);
      process.exit(1);
    }
  }
}

// ── One visitor's session ──

// The events a session fires, as [key, tags] pairs. `lift(key)` is the combined
// experiment lift for that event; `served` maps flag key -> the variation the
// visitor was served.
function sessionEvents(section, eventKeys, metricKeys, lift, served) {
  const path = section.path || "/";
  const has = (key) => eventKeys.has(key);
  const p = (key, base) => Math.min((base ?? EVENT_PROFILES[key]?.rate ?? DEFAULT_METRIC_RATE) * lift(key), RATE_CAP);
  const events = [];

  const visible = (key) => !SHOWN_BY[key] || SHOWN_BY[key].shown(served.get(SHOWN_BY[key].flag));
  for (const [key, profile] of Object.entries(EVENT_PROFILES)) {
    if (has(key) && visible(key) && chance(p(key))) events.push([key, profile.tags(section, served)]);
  }
  for (const key of metricKeys) {
    if (!EVENT_PROFILES[key] && !/^(scroll_depth|time_on_page|form_|customer_identified)/.test(key) && chance(p(key))) {
      events.push([key, {}]);
    }
  }

  // Scroll and dwell fire at increasing thresholds, each one less likely than the last.
  if (has("scroll_depth") && chance(p("scroll_depth", 0.45))) {
    for (const [depth, next] of [[25, 0.7], [50, 0.7], [75, 0.55], [100, 0]]) {
      events.push(["scroll_depth", { depth, path }]);
      if (!chance(next)) break;
    }
  }
  if (has("time_on_page") && chance(p("time_on_page", 0.35))) {
    for (const [seconds, next] of [[30, 0.6], [60, 0.4], [180, 0]]) {
      events.push(["time_on_page", { seconds, path }]);
      if (!chance(next)) break;
    }
  }

  // Forms are a funnel: start, then submit (and sometimes identify) or abandon.
  if (has("form_start") && chance(Math.min(0.08 * lift("form_start"), RATE_CAP))) {
    const form = pick(FORMS);
    events.push(["form_start", { form }]);
    if (chance(Math.min(0.4 * lift("form_submit"), RATE_CAP))) {
      if (has("form_submit")) events.push(["form_submit", { form, fields: rand(3, 6), status: "success" }]);
      if (has("customer_identified") && chance(0.5)) events.push(["customer_identified", { has_email: true }]);
    } else if (has("form_abandon") && chance(0.5)) {
      events.push(["form_abandon", { form }]);
    }
  }

  return events;
}

// ── Per-visitor ODP payload ──

function odpEventsForVisitor(visitorId, section, isKnown, email, fired) {
  const identifiers = isKnown ? { fs_user_id: visitorId, email } : { fs_user_id: visitorId };
  const persona = section.persona ?? "general";
  const events = [];

  // 1-3 pageviews: homepage then the section landing page. The section path is
  // what business/personal audiences key on.
  const paths = ["", section.path, section.path].slice(0, rand(1, 3));
  for (const p of paths) {
    events.push({
      type: "pageview",
      action: "pageview",
      identifiers,
      data: { page: `https://${HOSTNAME}/${p.replace(/^\//, "")}`, persona },
    });
  }

  // The events this visitor fired, mirrored into ODP so the funnel lines up across
  // the two systems (plus the analytics-only events FX does not define).
  for (const [key, tags] of fired) {
    events.push({ type: "event", action: key, identifiers, data: { ...tags, persona } });
  }
  return events;
}

async function main() {
  console.log(`${DRY_RUN ? "[dry-run] building" : "Seeding"} FX + ODP fake traffic (${NUM_USERS} visitors, only=${ONLY})...`);

  const fx = SEED_FX ? await buildFx(await loadContentTests()) : null;
  const plans = fx?.plans ?? [];
  for (const plan of plans.filter((p) => p.effects)) {
    const versions = [...plan.effects].map(([v, e]) => `${v} v${e.version} x${e.factor.toFixed(2)}`).join(", ");
    console.log(`FX content test ${plan.flagKey}: ${versions || "no live variation"}`);
  }
  // A session fires every profiled event, like the site does. Only the keys the FX
  // datafile defines go to FX; the analytics-only ones (feature_viewed,
  // segment_qualified, customer_identified) are archived there and go to ODP only.
  const fxKeys = new Set(fx?.eventKeys ?? []);
  const eventKeys = new Set([...fxKeys, ...Object.keys(EVENT_PROFILES), "scroll_depth", "time_on_page", "form_start", "form_submit", "form_abandon", "customer_identified"]);
  const wx = SEED_WX ? await loadWx() : null;
  const wxPlans = wx?.plans ?? [];
  const wxCampaigns = wx?.campaigns ?? [];
  const metricKeys = [...new Set([...plans, ...wxPlans, ...wxCampaigns].flatMap((p) => p.metrics))];
  await preflight(plans, wx);

  let fxEvents = 0;
  let odpVisitors = 0;
  let odpEvents = 0;
  let odpFailures = 0;
  let profilesSet = 0;
  let wxDecisions = 0;
  let wxFailures = 0;
  let wxQueue = [];
  const flushWx = async () => {
    if (wxQueue.length === 0) return;
    const visitors = wxQueue;
    wxQueue = [];
    if (DRY_RUN) return;
    const res = await sendWx(wx.ids, visitors);
    if (!res.ok) {
      wxFailures += visitors.length;
      if (res.status >= 400 && res.status < 500) {
        console.error(`Fatal WX Event API error HTTP ${res.status} ${res.text.slice(0, 300)}. Stopping.`);
        process.exit(1);
      }
    }
  };

  for (let u = 0; u < NUM_USERS; u++) {
    const visitorId = crypto.randomUUID();
    const section = pickWeighted(SECTIONS);
    const isKnown = chance(KNOWN_CUSTOMER_RATE);
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const email = `${first}.${last}`.toLowerCase().replace(/[^a-z]/g, "") + `${rand(1, 9999)}@example.com`;

    // FX: decide each running experiment (fires an impression unless dry-run), then
    // play out a session whose metric rates are lifted for winning variations.
    // Attributes mirror buildFxAttributes() in src/lib/optimizely/fxAttributes.ts.
    const device = chance(MOBILE_RATE) ? "mobile" : "desktop";
    const decided = [];
    let ctx = null;
    if (fx) {
      ctx = fx.client.createUserContext(visitorId, {
        hostname: HOSTNAME,
        device,
        logged_in: isKnown,
        page_views: 1 + Math.floor(Math.random() ** 2 * 12),
        ...(section.persona ? { persona: section.persona } : {}),
      });
      for (const plan of plans) {
        const d = DRY_RUN
          ? ctx?.decide(plan.flagKey, [OptimizelyDecideOption.DISABLE_DECISION_EVENT])
          : ctx?.decide(plan.flagKey);
        const variation = d?.variationKey ?? "off";
        decided.push([plan, variation]);
      }
    }
    // WX: the experiments this visitor's pages reach (by persona; an audience-gated one
    // only for visitors who match it), bucketed by the experiment's own weights.
    const visitor = { device, loggedIn: isKnown, persona: section.persona };
    const wxDecided = [];
    const wxDecisionList = [];
    for (const plan of wxPlans) {
      const { exposure, audience } = plan.wx;
      if (audience && !inAudience(audience, visitor)) continue;
      if (!chance(exposure[section.persona] ?? exposure.default ?? 0)) continue;
      const v = pickWeighted(plan.wx.variations);
      wxDecided.push([plan, v.key]);
      wxDecisionList.push({ campaignId: plan.wx.campaignId, experimentId: plan.wx.experimentId, variationId: v.id });
    }
    for (const plan of wxCampaigns) {
      const { exposure, experiences, holdback, campaignId } = plan.campaign;
      if (!chance(exposure[section.persona] ?? exposure.default ?? 0)) continue;
      const x = experiences.find((e) => inAudience(e.audience, visitor));
      if (!x) continue; // "Everyone else": no experience, no decision
      const held = chance(holdback / 10000);
      wxDecided.push([plan, held ? "holdback" : x.key]);
      wxDecisionList.push({ campaignId, experimentId: x.experimentId, variationId: x.variationId, holdback: held });
    }
    if (wxDecisionList.length > 0) {
      // A second before this visitor's FX events, so every conversion follows its decision.
      wxQueue.push(
        wxVisitor(
          wx.ids,
          visitorId,
          wxDecisionList,
          { persona: section.persona ?? "new_visitor", device, logged_in: isKnown },
          Date.now() - 1000
        )
      );
      wxDecisions += wxDecisionList.length;
      if (wxQueue.length >= WX_BATCH_VISITORS) await flushWx();
    }
    const allDecided = [...decided, ...wxDecided];
    const lift = (key) => allDecided.reduce((m, [plan, variation]) => m * planLift(plan, variation, key), 1);
    const served = new Map(decided.map(([plan, variation]) => [plan.flagKey, variation]));
    const fired = sessionEvents(section, eventKeys, metricKeys, lift, served);

    if (ctx) {
      for (const [key, tags] of fired) {
        if (!fxKeys.has(key)) continue;
        if (!DRY_RUN) ctx.trackEvent(key, { ...tags, persona: section.persona ?? "general" });
        fxEvents++;
      }
      const firedKeys = new Set(fired.map(([key]) => key));
      for (const [plan, variation] of allDecided) record(plan, variation, firedKeys);
    }

    // ODP: pageviews + mirrored events + optional known-customer identify.
    if (SEED_ODP) {
      const events = odpEventsForVisitor(visitorId, section, isKnown, email, fired);
      if (DRY_RUN) {
        odpVisitors++;
        odpEvents += events.length;
      } else {
        const res = await sendOdpEvents(events);
        if (res.ok) {
          odpVisitors++;
          odpEvents += events.length;
          if (isKnown) {
            const prof = await upsertOdpProfile(
              { fs_user_id: visitorId, email },
              { first_name: first, last_name: last, account_type: section.accountType }
            );
            if (prof.ok) profilesSet++;
          }
        } else {
          odpFailures++;
          if (res.status === 401 || res.status === 403) {
            console.error(`Fatal ODP error HTTP ${res.status} ${res.text}. Stopping.`);
            break;
          }
        }
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  await flushWx();
  if (fx && !DRY_RUN) {
    // Flush batched impression/conversion events before the process exits.
    await fx.client.close();
    await settleFxDispatches();
  }

  if (SEED_FX) {
    printReport([...plans, ...wxPlans, ...wxCampaigns]);
    console.log(
      `\nFX: ${fxEvents} events${DRY_RUN ? " (dry-run, nothing sent)" : `, ${fxDispatch.batches} batches`}` +
        (fxDispatch.failed ? `, ${fxDispatch.failed} FAILED (last: ${fxDispatch.lastError})` : "")
    );
  }
  if (SEED_WX && wx) {
    console.log(`WX: ${wxDecisions} decisions${DRY_RUN ? " (dry-run, nothing sent)" : ""}${wxFailures ? `, ${wxFailures} visitors failed` : ""}`);
  }
  if (SEED_ODP) {
    console.log(
      `ODP: ${odpVisitors} visitors, ${odpEvents} events` +
        (profilesSet ? `, ${profilesSet} known-customer profiles` : "") +
        (odpFailures ? `, ${odpFailures} failed` : "") +
        (DRY_RUN ? " (dry-run, nothing sent)" : "")
    );
  }
  if (DRY_RUN) {
    console.log("\nDry run: nothing was ingested. Re-run without --dry-run to send.");
  } else {
    console.log("\nCheck the FX and WX Results dashboards and run scripts/maintenance/test-odp.ts on a seeded id to verify.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
