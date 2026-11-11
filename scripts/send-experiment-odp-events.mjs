/**
 * Sends fake traffic to Optimizely Feature Experimentation (FX) and the
 * Optimizely Data Platform (ODP) so both dashboards look like a real, busy bank
 * site for demos. It is the FX/ODP sibling of scripts/send-ga4-events.mjs and is
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
 *   ODP - pageviews to business/personal sections (what realtime audiences key
 *         on), the same events the visitor fired in FX, and - for a minority of
 *         visitors - a known-customer identify so the business/personal audiences
 *         and homepage personalization populate.
 *
 * The same synthetic visitor feeds BOTH sinks, so the datasets stay consistent
 * (whoever converts in FX shows the matching funnel in ODP) - this mirrors how
 * the app's trackEvent() fans out to fx + odp at runtime.
 *
 * Usage:
 *   npm run exp:seed                 send a day of fake FX + ODP traffic
 *   npm run exp:seed -- --dry-run    build everything, print the realized
 *                                    variation + conversion distribution, send
 *                                    nothing (also accepts --debug)
 *   npm run exp:seed -- --users=100  override the number of synthetic visitors
 *   npm run exp:seed -- --only=fx    seed only FX (or --only=odp)
 *
 * Credentials are read from .env.local (or GitHub Actions secrets in CI):
 *   OPTIMIZELY_FX_SDK_KEY   datafile at cdn.optimizely.com/datafiles/<key>.json
 *   OPTIMIZELY_ODP_API_KEY  x-api-key for the ODP REST event API
 *   OPTIMIZELY_ODP_API_HOST defaults to https://api.zaius.com
 *
 * Notes / limits
 *   - Unlike GA4's Measurement Protocol, FX SDK events and ODP events are stamped
 *     at ingest time and cannot be meaningfully backdated, so history BUILDS
 *     FORWARD as the daily cron accumulates runs (no instant backfill).
 *   - Only flags with a RUNNING experiment in the live datafile get seeded. A
 *     flag that is only a targeted delivery has no result to show, so it is
 *     skipped. An event no experiment uses as a metric is still sent when it is
 *     part of a normal session (scroll depth, time on page, ...).
 *   - Both endpoints accept writes and return success regardless of whether the
 *     key is correct, so a green run is not proof by itself; verify in the FX
 *     Results dashboard and via scripts/maintenance/test-odp.ts.
 */

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

const BATCH_DELAY_MS = 60;
// The site hostname. It is passed as the FX `hostname` attribute and used in the
// ODP page URLs. It MUST match the audience that gates the live experiments
// (the "Main demo site" audience keys on hostname containing this value) - send
// any other host and every user fails the audience and buckets to "off".
const HOSTNAME = "optimizely-onboarding.vercel.app";
const KNOWN_CUSTOMER_RATE = 0.2; // ~20% of visitors are identified as known customers
const MOBILE_RATE = 0.55;

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
function buildPlan(flagKey, variationKeys, metrics) {
  const h = hash(flagKey);
  const challengers = variationKeys.slice(1);
  const isWinner = h % 2 === 0 && challengers.length > 0;
  const winner = isWinner ? challengers[h % challengers.length] : null;
  const lift = 1.25 + (h % 4) * 0.1; // 1.25 .. 1.55
  return { flagKey, variationKeys, metrics, isWinner, winner, lift };
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

async function buildFx() {
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
    eventProcessor: createBatchEventProcessor({ batchSize: 100, flushInterval: 2000 }),
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
    plans.push(buildPlan(flag.key, variationKeys, metrics));
  }
  return { client, plans, eventKeys };
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
    const tag = plan.isWinner ? `winner: ${plan.winner} x${plan.lift.toFixed(2)}` : "flat";
    console.log(`\n  ${plan.flagKey}  (${tag}, metrics: ${plan.metrics.join(", ") || "none"})`);
    for (const variation of Object.keys(s.impressions).sort()) {
      const imp = s.impressions[variation];
      const rates = plan.metrics
        .map((key) => `${key} ${(((s.conversions[variation]?.[key] ?? 0) / imp) * 100).toFixed(1)}%`)
        .join("  ");
      const star = plan.winner === variation ? " *" : "";
      console.log(`    ${variation.padEnd(16)} ${String(imp).padStart(5)} imp  ${rates}${star}`);
    }
  }
}

// ── Preflight: fail loudly on bad credentials before the main loop ──

async function preflight(plans) {
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
  if (has("form_start") && chance(0.08)) {
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

  // The events this visitor fired in FX, mirrored into ODP so the funnel lines up
  // across the two systems.
  for (const [key, tags] of fired) {
    events.push({ type: "event", action: key, identifiers, data: { ...tags, persona } });
  }
  return events;
}

async function main() {
  console.log(`${DRY_RUN ? "[dry-run] building" : "Seeding"} FX + ODP fake traffic (${NUM_USERS} visitors, only=${ONLY})...`);

  const fx = SEED_FX ? await buildFx() : null;
  const plans = fx?.plans ?? [];
  // Without FX there is no datafile, so the ODP-only run uses the profiled events.
  const eventKeys = new Set(fx?.eventKeys ?? [...Object.keys(EVENT_PROFILES), "scroll_depth", "time_on_page", "form_start", "form_submit", "form_abandon", "customer_identified"]);
  const metricKeys = [...new Set(plans.flatMap((p) => p.metrics))];
  await preflight(plans);

  let fxEvents = 0;
  let odpVisitors = 0;
  let odpEvents = 0;
  let odpFailures = 0;
  let profilesSet = 0;

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
    const decided = [];
    let ctx = null;
    if (fx) {
      ctx = fx.client.createUserContext(visitorId, {
        hostname: HOSTNAME,
        device: chance(MOBILE_RATE) ? "mobile" : "desktop",
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
    const lift = (key) =>
      decided.reduce((m, [plan, variation]) => (plan.winner === variation && plan.metrics.includes(key) ? m * plan.lift : m), 1);
    const served = new Map(decided.map(([plan, variation]) => [plan.flagKey, variation]));
    const fired = sessionEvents(section, eventKeys, metricKeys, lift, served);

    if (ctx) {
      for (const [key, tags] of fired) {
        if (!DRY_RUN) ctx.trackEvent(key, { ...tags, persona: section.persona ?? "general" });
        fxEvents++;
      }
      const firedKeys = new Set(fired.map(([key]) => key));
      for (const [plan, variation] of decided) record(plan, variation, firedKeys);
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

  if (fx && !DRY_RUN) {
    // Flush batched impression/conversion events before the process exits.
    await fx.client.close();
  }

  if (SEED_FX) {
    printReport(plans);
    console.log(`\nFX: ${fxEvents} events${DRY_RUN ? " (dry-run, nothing sent)" : ""}`);
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
    console.log("\nCheck the FX Results dashboard and run scripts/maintenance/test-odp.ts on a seeded id to verify.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
