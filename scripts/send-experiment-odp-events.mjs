/**
 * Sends fake traffic to Optimizely Feature Experimentation (FX) and the
 * Optimizely Data Platform (ODP) so both dashboards look like a real, busy bank
 * site for demos. It is the FX/ODP sibling of scripts/send-ga4-events.mjs and is
 * meant to run on the same daily schedule (see .github/workflows/experiment-odp-seed.yml).
 *
 * What it produces
 *   FX  - real impressions (via ctx.decide, so variation splits come from the
 *         live datafile's traffic allocation, not faked) plus conversion events
 *         (ctx.trackEvent). The set of experiments is DISCOVERED from the live
 *         datafile at runtime (every flag that has a running experiment), so the
 *         seeder never drifts from what is actually configured. Conversion rates
 *         are biased per variation to create a MIXED story: about half the
 *         experiments get a clear winning variation, the rest stay roughly flat.
 *   ODP - pageviews to business/personal sections (what realtime audiences key
 *         on), the matching mb_* conversion events, and - for a minority of
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
 *     flag that is only a rollout (no A/B experiment) is skipped - it would just
 *     bucket everyone to "off" with no result to show. The run prints which
 *     experiments it drove and which conversion event it used for each, so the
 *     FX console's per-experiment primary metric can be pointed at that event.
 *   - Both endpoints accept writes and return success regardless of whether the
 *     key is correct, so a green run is not proof by itself; verify in the FX
 *     Results dashboard and via scripts/test-odp.ts (see the plan's verification).
 */

import { config } from "dotenv";
import {
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
// (the "Personal - CMS" audience keys on hostname containing this value) - send
// any other host and every user fails the audience and buckets to "off".
const HOSTNAME = "opti.joshuaonwezen.dev";
const KNOWN_CUSTOMER_RATE = 0.2; // ~20% of visitors are identified as known customers

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
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

// Stable string hash so the "winner vs flat" assignment and base rates are
// deterministic per flag (the demo story does not reshuffle between runs).
function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

// Which part of the bank the visitor is interested in. `path` seeds the ODP
// pageviews (business vs personal paths are what the realtime audiences key on);
// `persona` is passed as an FX attribute; `accountType` tags identified customers.
const SECTIONS = [
  { persona: "personal",    path: "/personal",                    weight: 40, accountType: "personal" },
  { persona: "business",    path: "/business/business-banking",   weight: 20, accountType: "business" },
  { persona: "mortgage",    path: "/mortgage",                    weight: 18, accountType: "personal" },
  { persona: "investments", path: "/investments",                 weight: 12, accountType: "personal" },
  { persona: "general",     path: "",                             weight: 10, accountType: "personal" },
];

const FIRST_NAMES = ["Emma", "Liam", "Sophie", "Daan", "Noah", "Julia", "Lucas", "Mila", "James", "Sara", "Finn", "Ava"];
const LAST_NAMES = ["de Vries", "Jansen", "Smith", "Bakker", "Visser", "Brown", "Meijer", "Jones", "Mulder", "Taylor"];

// Choose the conversion event that best fits a flag, restricted to events that
// exist in the live datafile (so the FX console recognizes them). Falls back to
// the generic mb_cta_click.
function eventForFlag(flagKey, eventSet) {
  const f = flagKey.toLowerCase();
  const prefer =
    f.includes("hero") ? "mb_hero_cta_click" :
    f.includes("nav") || f.includes("mobile") ? "mb_nav_click" :
    f.includes("product") ? "mb_product_card_click" :
    f.includes("pricing") || f.includes("rate") ? "mb_pricing_tier_click" :
    "mb_cta_click";
  if (eventSet.has(prefer)) return prefer;
  if (eventSet.has("mb_cta_click")) return "mb_cta_click";
  return null;
}

// Turn a discovered experiment (flag + its variation keys) into a conversion
// plan: a base rate, whether it has a designed winner, which variation wins, and
// a per-variation conversion probability. About half of experiments (by hash)
// get a clear winner; the rest stay flat / inconclusive - the "mixed" story.
function buildPlan(flagKey, variationKeys, eventSet) {
  const h = hash(flagKey);
  const base = 0.08 + (h % 7) * 0.01; // 0.08 .. 0.14
  const isWinner = h % 2 === 0;
  const winner = variationKeys.includes("treatment")
    ? "treatment"
    : variationKeys.find((v) => !/^(off|control)$/i.test(v)) ?? variationKeys[0];
  const rates = {};
  for (const v of variationKeys) {
    const jitter = ((hash(flagKey + v) % 5) - 2) * 0.002; // deterministic +/- 0.4pp
    rates[v] = Math.max(0.02, base + jitter);
    if (isWinner && v === winner) rates[v] = Math.min(base * (1.55 + (h % 4) * 0.1), 0.42);
  }
  return { flagKey, variationKeys, isWinner, winner, rates, event: eventForFlag(flagKey, eventSet) };
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
  const eventSet = new Set((JSON.parse(datafileText).events ?? []).map((e) => e.key));
  // Default (batch) event processor: the bulk loop enqueues thousands of
  // impression/conversion events; batching flushes them efficiently on close().
  const client = createInstance({
    projectConfigManager: createStaticProjectConfigManager({ datafile: datafileText }),
    logger: createLogger({ level: ERROR }),
  });
  if (!client) {
    console.error("Failed to create the FX SDK client from the datafile.");
    process.exit(1);
  }
  await client.onReady();

  // Discover every flag that has a running experiment; skip rollout-only flags
  // (they would bucket everyone to "off" with no result to show).
  const cfg = client.getOptimizelyConfig();
  const plans = [];
  for (const [flagKey, feat] of Object.entries(cfg.featuresMap)) {
    const expKeys = Object.keys(feat.experimentsMap ?? {});
    if (expKeys.length === 0) continue;
    const vset = new Set();
    for (const ek of expKeys) for (const vk of Object.keys(feat.experimentsMap[ek].variationsMap)) vset.add(vk);
    plans.push(buildPlan(flagKey, [...vset], eventSet));
  }
  return { client, plans };
}

// ── Distribution tally for the dry-run / summary report ──

// stats[flagKey] = { impressions: {variation: n}, conversions: {variation: n} }
const stats = {};
function record(flagKey, variation, converted) {
  const s = (stats[flagKey] ??= { impressions: {}, conversions: {} });
  s.impressions[variation] = (s.impressions[variation] ?? 0) + 1;
  if (converted) s.conversions[variation] = (s.conversions[variation] ?? 0) + 1;
}

function printReport(plans) {
  console.log("\nExperiment distribution:");
  for (const plan of plans) {
    const s = stats[plan.flagKey];
    if (!s) continue;
    const tag = plan.isWinner ? `winner: ${plan.winner}` : "flat";
    console.log(`\n  ${plan.flagKey}  (${tag}, metric=${plan.event ?? "none"})`);
    for (const variation of Object.keys(s.impressions).sort()) {
      const imp = s.impressions[variation];
      const conv = s.conversions[variation] ?? 0;
      const rate = imp ? ((conv / imp) * 100).toFixed(1) : "0.0";
      const star = plan.isWinner && variation === plan.winner ? " *" : "";
      console.log(`    ${variation.padEnd(16)} ${String(imp).padStart(5)} imp  ${String(conv).padStart(5)} conv  ${rate.padStart(5)}%${star}`);
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

// ── Per-visitor ODP payload ──

function odpEventsForVisitor(visitorId, section, isKnown, email, conversions) {
  const identifiers = isKnown ? { fs_user_id: visitorId, email } : { fs_user_id: visitorId };
  const events = [];

  // 1-3 pageviews: homepage then the section landing page. The section path is
  // what business/personal audiences key on.
  const paths = ["", section.path, section.path].slice(0, rand(1, 3));
  for (const p of paths) {
    events.push({
      type: "pageview",
      action: "pageview",
      identifiers,
      data: { page: `https://${HOSTNAME}/${p.replace(/^\//, "")}`, persona: section.persona },
    });
  }

  // The mb_* conversions this visitor earned in FX, mirrored into ODP so the
  // funnel lines up across the two systems.
  for (const key of conversions) {
    events.push({ type: "event", action: key, identifiers, data: { persona: section.persona } });
  }

  // A little engagement noise so profiles are not just a single pageview.
  if (Math.random() < 0.4) {
    events.push({ type: "event", action: "mb_scroll_depth", identifiers, data: { percent: pick([50, 75, 90]) } });
  }
  return events;
}

async function main() {
  console.log(`${DRY_RUN ? "[dry-run] building" : "Seeding"} FX + ODP fake traffic (${NUM_USERS} visitors, only=${ONLY})...`);

  const fx = SEED_FX ? await buildFx() : null;
  const plans = fx?.plans ?? [];
  await preflight(plans);

  let odpVisitors = 0;
  let odpEvents = 0;
  let odpFailures = 0;
  let profilesSet = 0;

  for (let u = 0; u < NUM_USERS; u++) {
    const visitorId = crypto.randomUUID();
    const section = pickWeighted(SECTIONS);
    const isKnown = Math.random() < KNOWN_CUSTOMER_RATE;
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const email = `${first}.${last}`.toLowerCase().replace(/[^a-z]/g, "") + `${rand(1, 9999)}@example.com`;

    // FX: decide each running experiment (fires an impression unless dry-run),
    // then convert with the per-variation rate. Collect the earned mb_* events
    // to mirror into ODP.
    const conversions = [];
    if (fx) {
      const ctx = fx.client.createUserContext(visitorId, { hostname: HOSTNAME, persona: section.persona });
      for (const plan of plans) {
        const d = DRY_RUN
          ? ctx?.decide(plan.flagKey, [OptimizelyDecideOption.DISABLE_DECISION_EVENT])
          : ctx?.decide(plan.flagKey);
        const variation = d?.variationKey ?? "off";
        const rate = plan.rates[variation] ?? 0.08;
        const converted = Math.random() < rate;
        if (converted && plan.event) {
          conversions.push(plan.event);
          if (!DRY_RUN) ctx?.trackEvent(plan.event, { persona: section.persona });
        }
        record(plan.flagKey, variation, converted);
      }
    }

    // ODP: pageviews + mirrored conversions + optional known-customer identify.
    if (SEED_ODP) {
      const events = odpEventsForVisitor(visitorId, section, isKnown, email, conversions);
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

  if (SEED_FX) printReport(plans);
  if (SEED_ODP) {
    console.log(
      `\nODP: ${odpVisitors} visitors, ${odpEvents} events` +
        (profilesSet ? `, ${profilesSet} known-customer profiles` : "") +
        (odpFailures ? `, ${odpFailures} failed` : "") +
        (DRY_RUN ? " (dry-run, nothing sent)" : "")
    );
  }
  if (DRY_RUN) {
    console.log("\nDry run: nothing was ingested. Re-run without --dry-run to send.");
  } else {
    console.log("\nCheck the FX Results dashboard and run scripts/test-odp.ts on a seeded id to verify.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
