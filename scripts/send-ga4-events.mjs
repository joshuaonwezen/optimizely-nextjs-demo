/**
 * Sends fake traffic to a GA4 property via the Measurement Protocol so the
 * GA4 UI reports are populated with realistic-looking data.
 *
 * Usage:
 *   npm run ga4:seed                 send a batch of fake traffic
 *   npm run ga4:seed -- --debug      validate payloads only (does not ingest)
 *   npm run ga4:seed -- --users=100  override the number of synthetic users
 *   npm run ga4:seed -- --window=24  spread events over the last N hours
 *
 * Credentials are read from .env.local:
 *   GA4_MEASUREMENT_ID   defaults to G-2MTP98PSWL if unset
 *   GA4_API_SECRET       create in GA4 Admin -> Data Streams -> Measurement
 *                        Protocol API secrets, then paste the value here
 *
 * Note: GA4 drops any event older than ~72 hours, so WINDOW_HOURS must stay
 * under that. To build up months of history, run this on a daily schedule.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

// Default to the fake-data property (the one the API secret belongs to), NOT
// the app's client-side property G-2MTP98PSWL - sending to the wrong stream is
// silently dropped with a 204.
const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || "G-EKYQLXD2VB";
const API_SECRET = process.env.GA4_API_SECRET;

if (!API_SECRET) {
  console.error(
    "Error: GA4_API_SECRET must be set in .env.local\n" +
      "Create one in GA4 Admin -> Data Streams -> (your web stream) -> Measurement Protocol API secrets."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const DEBUG = args.includes("--debug");
// --verify sends a few current-timestamped events tagged debug_mode:true to the
// live endpoint so they appear in GA4 Admin -> DebugView within seconds. This is
// the only reliable way to confirm the measurement_id / api_secret pair actually
// ingests (the live endpoint returns 204 even when credentials are wrong).
const VERIFY = args.includes("--verify");
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};

const NUM_USERS = VERIFY ? getArg("users", 3) : getArg("users", 40);
// --locale=nl or --locale=en forces every session to one language. Without it,
// each session picks a language at random (NL_SHARE controls the Dutch share).
const FORCE_LOCALE = (args.find((a) => a.startsWith("--locale=")) || "").split("=")[1] || null;
const WINDOW_HOURS = Math.min(getArg("window", 72), 71);
const SESSIONS_PER_USER = [1, 3];
const PAGES_PER_SESSION = [1, 5];
const PURCHASE_RATE = 0.12;
const BATCH_DELAY_MS = 120;
const ORIGIN = "https://mosey-bank.example.com";
const NL_SHARE = 0.2; // ~20% of sessions browse the Dutch (/nl/) site, rest are English

// sub = path after the locale prefix; weight = relative pageview share;
// landing = plausible session entry page. Homepage and top section pages
// dominate; deep pages form a realistic long tail. Each page carries both an
// English and Dutch title so /nl/ traffic reads believably.
const PAGES = [
  { sub: "", en: "Mosey Bank - Home", nl: "Mosey Bank - Home", weight: 32, landing: true },
  { sub: "/personal", en: "Personal Banking", nl: "Particulier", weight: 13, landing: true },
  { sub: "/personal/current-account", en: "Current Account", nl: "Betaalrekening", weight: 8 },
  { sub: "/personal/savings", en: "Savings", nl: "Sparen", weight: 9, landing: true },
  { sub: "/personal/savings/easy-access-savings", en: "Easy Access Savings", nl: "Vrij Opneembaar Sparen", weight: 4 },
  { sub: "/personal/savings/fixed-rate-savings", en: "Fixed Rate Savings", nl: "Depositosparen", weight: 3 },
  { sub: "/personal/loans", en: "Loans", nl: "Leningen", weight: 4 },
  { sub: "/mortgage", en: "Mortgages", nl: "Hypotheken", weight: 11, landing: true },
  { sub: "/mortgage/first-time-buyers", en: "First Time Buyers", nl: "Starters", weight: 5, landing: true },
  { sub: "/mortgage/remortgaging", en: "Remortgaging", nl: "Oversluiten", weight: 3 },
  { sub: "/business/business-banking", en: "Business Banking", nl: "Zakelijk Bankieren", weight: 8, landing: true },
  { sub: "/business/business-banking/business-lending", en: "Business Lending", nl: "Zakelijke Financiering", weight: 3 },
  { sub: "/investments", en: "Investments", nl: "Beleggen", weight: 6, landing: true },
  { sub: "/investments/pensions", en: "Pensions", nl: "Pensioenen", weight: 3 },
  { sub: "/help", en: "Help", nl: "Help", weight: 5, landing: true },
  { sub: "/help/contact", en: "Contact", nl: "Contact", weight: 4 },
  { sub: "/help/branches", en: "Branches", nl: "Kantoren", weight: 3 },
  { sub: "/about/about-us", en: "About Us", nl: "Over Ons", weight: 4, landing: true },
];

const LANDING_PAGES = PAGES.filter((p) => p.landing);

const SOURCES = [
  { utm_source: "google", utm_medium: "organic", utm_campaign: "(organic)" },
  { utm_source: "(direct)", utm_medium: "(none)", utm_campaign: "(direct)" },
  { utm_source: "google", utm_medium: "cpc", utm_campaign: "brand-search" },
  { utm_source: "newsletter", utm_medium: "email", utm_campaign: "june-savings" },
  { utm_source: "facebook", utm_medium: "cpc", utm_campaign: "mortgage-promo" },
  { utm_source: "linkedin", utm_medium: "social", utm_campaign: "business-banking" },
  { utm_source: "bing", utm_medium: "organic", utm_campaign: "(organic)" },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

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

const endpoint = DEBUG
  ? "https://www.google-analytics.com/debug/mp/collect"
  : "https://www.google-analytics.com/mp/collect";
const url = `${endpoint}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`;

const now = Date.now();
const windowMs = WINDOW_HOURS * 60 * 60 * 1000;
const floorMs = now - windowMs;

function buildLocation(sub, locale, source) {
  const u = new URL(`${ORIGIN}/${locale}${sub}`);
  if (source.utm_source !== "(direct)") {
    u.searchParams.set("utm_source", source.utm_source);
    u.searchParams.set("utm_medium", source.utm_medium);
    u.searchParams.set("utm_campaign", source.utm_campaign);
  }
  return u.toString();
}

// Build one request payload (one session) with all its events.
function buildSession({ clientId, locale }) {
  const source = pick(SOURCES);
  // In verify mode keep everything at "now" so it lands in DebugView/Realtime.
  const sessionStartMs = VERIFY ? now - 30_000 : rand(floorMs + 60_000, now - 60_000);
  const sessionId = Math.floor(sessionStartMs / 1000);
  const pageCount = rand(PAGES_PER_SESSION[0], PAGES_PER_SESSION[1]);

  // session_start / first_visit / user_engagement are reserved names that GA4
  // auto-generates from a new session_id/client_id, so we never send them.
  const events = [];
  const commonParams = () => ({
    session_id: String(sessionId),
    engagement_time_msec: rand(1000, 45000),
    ...(VERIFY ? { debug_mode: true } : {}),
  });

  let referrer = source.utm_source === "(direct)" ? "" : `https://${source.utm_source}.com/`;
  for (let i = 0; i < pageCount; i++) {
    // Sessions land on a landing page, then navigate deeper by weight.
    const page = i === 0 ? pickWeighted(LANDING_PAGES) : pickWeighted(PAGES);
    const location = buildLocation(page.sub, locale, source);
    events.push({
      name: "page_view",
      params: {
        page_location: location,
        page_title: locale === "nl" ? page.nl : page.en,
        page_referrer: referrer,
        ...commonParams(),
      },
    });
    referrer = location;
    if (Math.random() < 0.4) {
      events.push({ name: "scroll", params: { percent_scrolled: 90, ...commonParams() } });
    }
  }

  if (Math.random() < PURCHASE_RATE) {
    const value = rand(50, 2500);
    events.push({
      name: "purchase",
      params: {
        currency: "USD",
        value,
        transaction_id: `T-${sessionId}-${rand(1000, 9999)}`,
        items: [
          {
            item_id: `sku_${rand(1, 20)}`,
            item_name: pick(["Savings Plan", "Mortgage Application", "Business Loan", "Pension"]),
            price: value,
            quantity: 1,
          },
        ],
        ...commonParams(),
      },
    });
  }

  // Assign per-event timestamps advancing through the session, clamped to now.
  let eventMs = sessionStartMs;
  for (const ev of events) {
    eventMs = Math.min(eventMs + rand(2000, 60000), now - 1000);
    ev.timestamp_micros = String(eventMs * 1000);
  }

  // Measurement Protocol accepts at most 25 events per request.
  return {
    client_id: clientId,
    timestamp_micros: String(sessionStartMs * 1000),
    events: events.slice(0, 25),
  };
}

async function send(payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (DEBUG) {
    const body = await res.json().catch(() => ({}));
    const messages = body.validationMessages || [];
    if (messages.length > 0) {
      console.error("Validation errors:", JSON.stringify(messages, null, 2));
      return { ok: false };
    }
    return { ok: true, validated: true };
  }

  // The live endpoint returns 204 with no body on success.
  if (!res.ok) {
    const text = await res.text();
    console.error(`HTTP ${res.status}: ${text}`);
    return { ok: false, fatal: res.status === 401 || res.status === 400 };
  }
  return { ok: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mode = DEBUG ? "[debug] validating" : VERIFY ? "[verify] sending live" : "Sending";
console.log(
  `${mode} fake GA4 traffic to ${MEASUREMENT_ID} ` +
    (VERIFY ? `(${NUM_USERS} users, at current time, debug_mode on)...` : `(${NUM_USERS} users, last ${WINDOW_HOURS}h)...`)
);

let sessions = 0;
let nlSessions = 0;
let events = 0;
let failures = 0;

for (let u = 0; u < NUM_USERS; u++) {
  const clientId = `${rand(1000000000, 1999999999)}.${Math.floor(floorMs / 1000)}`;
  const sessionCount = rand(SESSIONS_PER_USER[0], SESSIONS_PER_USER[1]);
  for (let s = 0; s < sessionCount; s++) {
    const locale = FORCE_LOCALE || (Math.random() < NL_SHARE ? "nl" : "en");
    const payload = buildSession({ clientId, locale });
    const result = await send(payload);
    if (result.ok) {
      sessions++;
      if (locale === "nl") nlSessions++;
      events += payload.events.length;
    } else {
      failures++;
      if (result.fatal) {
        console.error("Fatal error (bad API secret or malformed request). Stopping.");
        process.exit(1);
      }
    }
    await sleep(BATCH_DELAY_MS);
  }
}

const nlPct = sessions ? Math.round((nlSessions / sessions) * 100) : 0;
console.log(
  `Done. ${sessions} sessions (${nlPct}% nl), ${events} events${failures ? `, ${failures} failed` : ""}.`
);
if (DEBUG) {
  console.log("Debug mode: nothing was ingested. Re-run without --debug to send.");
} else if (VERIFY) {
  console.log(
    "Now open GA4 Admin -> DebugView (top-left device should be 'Node.js' or unnamed).\n" +
      "If these events appear within ~30s, the credentials work. If nothing shows,\n" +
      "the measurement_id / api_secret pair is wrong or belongs to another stream."
  );
} else {
  console.log("Check GA4 -> Reports -> Realtime to see near-now events within seconds.");
}
