/**
 * Bulk content volume seed script.
 *
 * Adds a mix of pages using EXISTING content types to raise total page count
 * well past 200 per instance: 80 ArticlePage, 20 ConsultantPage, 12 CaseStudyPage
 * (each with its own OutcomeItemBlocks + TestimonialBlock), 8 BlogExperience.
 *
 * All content is generated from small template datasets rather than hand-authored
 * one by one, but reads as plausible fake Mosey Bank content (not placeholder spam).
 *
 * Every key is a stableKey() derivation, so re-running this script - or running it
 * against a different instance - upserts the exact same 120 items everywhere.
 *
 * Run: npx tsx scripts/seed-bulk-content.ts
 * Prerequisites: seed-modeling.ts (authors + Articles/Case Studies hubs),
 * seed-consultants.ts (Consultants hub), seed-blogs.ts (Blogs hub + hero image).
 */

import { config } from "dotenv";
import {
  createContent,
  ensureSubfolder,
  getManagementToken,
  patchPublishedPageProperties,
  CONTENT_ENDPOINT,
  stableKey,
  uid,
  gridSection,
  elementComponent,
} from "./_shared";
import { termsForUrl } from "./taxonomy-tree";
import { termUri } from "./_taxonomy";

config({ path: ".env.local" });

// CMS Categories (taxonomy) are assigned by URL shape, same mechanism as
// scripts/seed-categories.ts - see the bulk-content rules added to TOPIC_RULES
// in taxonomy-tree.ts. Done here too (not only by a later seed-categories run)
// so every page this script creates is categorized immediately, and so a
// manual run of just this script is still fully tagged.
async function assignCategories(key: string, url: string, label: string): Promise<void> {
  const terms = termsForUrl(url);
  if (terms.length === 0) {
    console.warn(`  [warn] ${label}: no taxonomy rule matched ${url} - left uncategorized`);
    return;
  }
  try {
    await patchPublishedPageProperties(key, { categories: terms.map(termUri) });
  } catch (err) {
    console.warn(`  [warn] ${label}: failed to assign categories - ${(err as Error).message.slice(0, 200)}`);
  }
}

// Prerequisite keys, recomputed the same way other scripts do (see seed-blogs.ts:127)
// rather than importing the scripts that create them.
const AUTHOR_KEYS = [
  stableKey("mb-model", "author:evieMarsh"),
  stableKey("mb-model", "author:jordanReid"),
  stableKey("mb-model", "author:priyaShah"),
];
const ARTICLES_HUB_KEY = stableKey("mb-model", "hub:articlesIdx");
const CASE_STUDIES_HUB_KEY = stableKey("mb-model", "hub:caseStudiesIdx");
const CONSULTANTS_HUB_KEY = "cc000000000000000000000000000000";
const BLOGS_HUB_KEY = "b1049a5f7c6d4e0a9f2b1c3d4e5f6a70";
const HERO_IMAGE_REF = "cms://content/b10a55e7000000000000000000000001";

const CATEGORY_ENUM = ["personal-finance", "business-banking", "investments", "market-insights"];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function contentExists(key: string): Promise<boolean> {
  const token = await getManagementToken();
  const res = await fetch(`${CONTENT_ENDPOINT}/${key}`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

async function checkPrerequisites(): Promise<void> {
  const checks: Array<[string, string, string]> = [
    [AUTHOR_KEYS[0], "AuthorBlock", "seed-modeling.ts"],
    [ARTICLES_HUB_KEY, "Articles hub", "seed-modeling.ts"],
    [CASE_STUDIES_HUB_KEY, "Case Studies hub", "seed-modeling.ts"],
    [CONSULTANTS_HUB_KEY, "Consultants hub", "seed-consultants.ts"],
    [BLOGS_HUB_KEY, "Blogs hub", "seed-blogs.ts"],
  ];
  for (const [key, label, script] of checks) {
    if (!(await contentExists(key))) {
      throw new Error(`Prerequisite missing: ${label} (${key}) not found. Run ${script} first.`);
    }
  }
}

// --- Articles (80 = 16 topics x 5 angles) -----------------------------------

const ARTICLE_TOPICS = [
  "Switching your current account",
  "Joint accounts explained",
  "Understanding overdraft fees",
  "Saving for a wedding",
  "Protecting against card fraud",
  "Building an emergency fund",
  "Getting a decision in principle",
  "Choosing a savings account",
  "Managing a variable income",
  "Setting up a standing order",
  "Reading your credit report",
  "Planning a career break",
  "Opening a business account",
  "Claiming business expenses",
  "Cutting international transfer fees",
  "Preparing for a rate rise",
];

const ARTICLE_ANGLES: Array<{ suffix: string; lead: string }> = [
  {
    suffix: "what you need to know",
    lead: "There's more to {topicLower} than most people realise, and getting the basics right early saves time later.",
  },
  {
    suffix: "a beginner's guide",
    lead: "If {topicLower} feels unfamiliar, start here - this is the plain-English version, no jargon.",
  },
  {
    suffix: "5 things to know",
    lead: "We get asked about {topicLower} every week at Mosey. Here are the five answers that come up most.",
  },
  {
    suffix: "common mistakes to avoid",
    lead: "Most of the trouble around {topicLower} comes down to a handful of avoidable mistakes.",
  },
  {
    suffix: "explained simply",
    lead: "{topic} doesn't need to be complicated. Here's the short version.",
  },
];

interface ArticleDef {
  key: string;
  routeSegment: string;
  displayName: string;
  title: string;
  summary: string;
  bodyHtml: string;
  authorKey: string;
  publishDate: string;
  category: string;
  tags: string[];
}

function buildArticles(): ArticleDef[] {
  const articles: ArticleDef[] = [];
  let i = 0;
  for (const topic of ARTICLE_TOPICS) {
    const topicLower = topic[0].toLowerCase() + topic.slice(1);
    for (const angle of ARTICLE_ANGLES) {
      const title = `${topic}: ${angle.suffix}`;
      const slug = slugify(title);
      const lead = angle.lead.replace(/\{topicLower\}/g, topicLower).replace(/\{topic\}/g, topic);
      const category = CATEGORY_ENUM[i % CATEGORY_ENUM.length];
      const authorKey = AUTHOR_KEYS[i % AUTHOR_KEYS.length];
      const day = 1 + (i % 27);
      const month = 1 + (Math.floor(i / 27) % 12);
      articles.push({
        key: stableKey("mb-bulk", `article:${slug}`),
        routeSegment: slug,
        displayName: `Article - ${title}`,
        title,
        summary: `${lead} Here's what Mosey customers should keep in mind about ${topicLower}.`,
        bodyHtml: [
          `<p>${lead}</p>`,
          `<p>At Mosey Bank, we talk to customers about ${topicLower} most often when they're making a change - moving banks, hitting a milestone, or just reviewing where their money sits. The short version: understand the terms, compare what's actually on offer, and don't assume your current setup is still the best one for you.</p>`,
          `<p>If ${topicLower} applies to your situation, it's worth a 10-minute look at your account this month rather than leaving it for "someday." Small adjustments now tend to compound into real savings over a year.</p>`,
        ].join(""),
        authorKey,
        publishDate: `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00.000Z`,
        category,
        tags: [slugify(topic).split("-")[0], category],
      });
      i++;
    }
  }
  return articles;
}

async function seedArticles(): Promise<void> {
  const articles = buildArticles();
  console.log(`\n--- Seeding ${articles.length} bulk Articles ---`);
  let created = 0;
  for (const a of articles) {
    const result = await createContent(
      {
        key: a.key,
        contentType: "ArticlePage",
        locale: "en",
        container: ARTICLES_HUB_KEY,
        status: "published",
        displayName: a.displayName,
        routeSegment: a.routeSegment,
        properties: {
          title: a.title,
          summary: a.summary,
          body: { html: a.bodyHtml },
          author: `cms://content/${a.authorKey}`,
          publishDate: a.publishDate,
          category: a.category,
          tags: a.tags,
        },
      },
      a.displayName
    );
    if (result) created++;
    await assignCategories(a.key, `/insights/articles/${a.routeSegment}/`, a.displayName);
  }
  console.log(`  [done] ${created} created, ${articles.length - created} skipped (already existed)`);
}

// --- Consultants (20) --------------------------------------------------------

interface ConsultantDef {
  key: string;
  routeSegment: string;
  name: string;
  jobTitle: string;
  expertise: string[];
  focus: string;
}

const CONSULTANTS: ConsultantDef[] = [
  { key: "", routeSegment: "", name: "Ella Thompson", jobTitle: "Buy-to-Let Mortgage Adviser", expertise: ["Buy-to-let", "Portfolio landlords", "Remortgaging"], focus: "landlords building or refinancing a rental property portfolio" },
  { key: "", routeSegment: "", name: "Noah Bennett", jobTitle: "Digital Savings Specialist", expertise: ["Digital savings", "Fixed-rate bonds", "Regular savers"], focus: "customers who manage their savings entirely through the app" },
  { key: "", routeSegment: "", name: "Isla Robertson", jobTitle: "Payroll & Business Finance Adviser", expertise: ["Payroll setup", "Small business cash flow", "Business cards"], focus: "small businesses setting up payroll and day-to-day finance for the first time" },
  { key: "", routeSegment: "", name: "Harvey Collins", jobTitle: "Inheritance Tax Planning Adviser", expertise: ["Inheritance tax", "Trusts", "Estate planning"], focus: "families planning how to pass on wealth with less tax exposure" },
  { key: "", routeSegment: "", name: "Freya Mitchell", jobTitle: "Education Savings Adviser", expertise: ["Junior ISAs", "Education savings", "Long-term investing"], focus: "parents and guardians saving toward a child's education" },
  { key: "", routeSegment: "", name: "Leo Carter", jobTitle: "Self-Employed Finance Adviser", expertise: ["Self-assessment", "Sole trader accounts", "Variable income"], focus: "self-employed customers managing irregular income and tax" },
  { key: "", routeSegment: "", name: "Amelia Foster", jobTitle: "Later Life Mortgage Adviser", expertise: ["Equity release", "Retirement interest-only", "Downsizing"], focus: "customers in later life exploring equity release or downsizing" },
  { key: "", routeSegment: "", name: "Jack Sullivan", jobTitle: "Franchise Finance Adviser", expertise: ["Franchise lending", "Business growth loans", "Asset finance"], focus: "franchisees financing a new location or expanding an existing one" },
  { key: "", routeSegment: "", name: "Sophie Wallace", jobTitle: "Joint Finance Adviser", expertise: ["Joint accounts", "Shared budgeting", "Relationship finance"], focus: "couples combining finances for the first time" },
  { key: "", routeSegment: "", name: "Oscar Reid", jobTitle: "Overseas Property Adviser", expertise: ["Overseas mortgages", "Currency transfers", "Second homes"], focus: "customers buying property abroad and managing the currency side" },
  { key: "", routeSegment: "", name: "Mia Campbell", jobTitle: "Credit Building Adviser", expertise: ["Credit building", "Secured credit cards", "First-time credit"], focus: "customers with thin or damaged credit files rebuilding a track record" },
  { key: "", routeSegment: "", name: "Ethan Brooks", jobTitle: "Charity & Not-for-Profit Adviser", expertise: ["Charity accounts", "Grant management", "Trustee reporting"], focus: "charities and community groups managing restricted and unrestricted funds" },
  { key: "", routeSegment: "", name: "Charlotte Dixon", jobTitle: "Return-to-Work Finance Adviser", expertise: ["Career breaks", "Returning to work", "Family budgeting"], focus: "customers returning to work after a career break and resetting their budget" },
  { key: "", routeSegment: "", name: "Henry Walsh", jobTitle: "Agricultural Succession Adviser", expertise: ["Farm succession", "Rural asset finance", "Multi-generational planning"], focus: "farming families planning handover to the next generation" },
  { key: "", routeSegment: "", name: "Grace Palmer", jobTitle: "Freelancer Finance Adviser", expertise: ["Freelance invoicing", "Late payment protection", "Project-based budgeting"], focus: "freelancers managing lumpy income between projects" },
  { key: "", routeSegment: "", name: "Daniel Marsh", jobTitle: "Mergers & Acquisitions Adviser", expertise: ["Business sale finance", "Acquisition lending", "Due diligence support"], focus: "business owners financing a sale, merger, or acquisition" },
  { key: "", routeSegment: "", name: "Ruby Simpson", jobTitle: "First Job Finance Adviser", expertise: ["Starting salary budgeting", "Workplace pensions", "First savings goals"], focus: "customers starting their first full-time job and first payslip" },
  { key: "", routeSegment: "", name: "Alfie Turner", jobTitle: "Renovation Finance Adviser", expertise: ["Renovation loans", "Bridging finance", "Energy-efficiency grants"], focus: "homeowners financing a renovation or energy-efficiency upgrade" },
  { key: "", routeSegment: "", name: "Lily Osborne", jobTitle: "Divorce Settlement Finance Adviser", expertise: ["Mortgage transfers", "Asset division", "Rebuilding credit"], focus: "customers untangling joint finances during a separation" },
  { key: "", routeSegment: "", name: "Max Fletcher", jobTitle: "Seasonal Business Adviser", expertise: ["Seasonal cash flow", "Stock financing", "Short-term overdrafts"], focus: "businesses with strongly seasonal income, like retail and hospitality" },
].map((c) => ({
  ...c,
  routeSegment: slugify(c.name),
  key: stableKey("mb-bulk", `consultant:${slugify(c.name)}`),
}));

async function seedConsultants(): Promise<void> {
  console.log(`\n--- Seeding ${CONSULTANTS.length} bulk Consultants ---`);
  let created = 0;
  for (const c of CONSULTANTS) {
    const bio = [
      `<p>${c.name} is a ${c.jobTitle} at Mosey Bank, working day to day with ${c.focus}.</p>`,
      `<p>${c.name.split(" ")[0]} focuses on ${c.expertise.map((e) => e.toLowerCase()).join(", ")}, and takes a straightforward approach: understand the full picture before recommending a product, not the other way round.</p>`,
    ].join("");
    const result = await createContent(
      {
        key: c.key,
        contentType: "ConsultantPage",
        container: CONSULTANTS_HUB_KEY,
        locale: "en",
        status: "published",
        displayName: c.name,
        routeSegment: c.routeSegment,
        properties: {
          name: c.name,
          jobTitle: c.jobTitle,
          summary: `${c.name} advises on ${c.expertise.map((e) => e.toLowerCase()).join(", ")}, working with ${c.focus}.`,
          bio: { html: bio },
          expertise: c.expertise,
          email: `${slugify(c.name).replace(/-/g, ".")}@moseybank.com`,
        },
      },
      c.name
    );
    if (result) created++;
    await assignCategories(c.key, `/consultants/${c.routeSegment}/`, c.name);
  }
  console.log(`  [done] ${created} created, ${CONSULTANTS.length - created} skipped (already existed)`);
}

// --- Case Studies (12) -------------------------------------------------------

interface CaseStudyDef {
  slug: string;
  title: string;
  clientName: string;
  industry: string;
  summary: string;
  challengeHtml: string;
  solutionHtml: string;
  outcomes: Array<{ stat: string; suffix: string; label: string }>;
  testimonialQuote: string;
  testimonialAuthorName: string;
  testimonialAuthorRole: string;
}

const CASE_STUDIES: CaseStudyDef[] = [
  {
    slug: "cafe-chain-faster-settlement", title: "How a Leeds café chain cut card-settlement time from a week to a day",
    clientName: "Marlowe Coffee Co.", industry: "business-banking",
    summary: "A five-site café chain moved its card processing to Mosey and freed up working capital that used to sit in transit for a week.",
    challengeHtml: "<p>Marlowe Coffee Co. ran five sites on a legacy card processor that settled funds after seven days, leaving the business chronically short of cash around payroll.</p>",
    solutionHtml: "<p>Mosey's Business team moved all five terminals to next-day settlement and consolidated banking into a single account with site-level reporting.</p>",
    outcomes: [{ stat: "6", suffix: " d", label: "Faster settlement (7d to 1d)" }, { stat: "22", suffix: "%", label: "Reduction in short-term borrowing" }],
    testimonialQuote: "We used to juggle payroll around when card money actually landed. Now it's just there the next morning.",
    testimonialAuthorName: "Priya Malhotra", testimonialAuthorRole: "Owner, Marlowe Coffee Co.",
  },
  {
    slug: "sole-trader-separates-accounts", title: "A sole trader's first year: why separating accounts changed everything",
    clientName: "Dan's Carpentry", industry: "business-banking",
    summary: "A one-person carpentry business opened a dedicated business account in its first year and halved the time spent on bookkeeping.",
    challengeHtml: "<p>All income and expenses ran through one personal account, making Self Assessment a multi-week task every January.</p>",
    solutionHtml: "<p>Mosey opened a business current account with Xero integration from day one, splitting personal and business money cleanly.</p>",
    outcomes: [{ stat: "50", suffix: "%", label: "Less time spent on bookkeeping" }, { stat: "3", suffix: " d", label: "Time to open the account" }],
    testimonialQuote: "Separating the accounts felt like overkill until tax season came round and I realised how much time it saved.",
    testimonialAuthorName: "Dan Walker", testimonialAuthorRole: "Owner, Dan's Carpentry",
  },
  {
    slug: "couple-consolidates-pensions", title: "Consolidating three pensions before retirement: a couple's story",
    clientName: "The Harringtons", industry: "investments",
    summary: "A couple nearing retirement consolidated three separate workplace pensions into a single Mosey drawdown plan.",
    challengeHtml: "<p>Three pensions from previous employers, each with different fees and fund choices, made it hard to see the full retirement picture.</p>",
    solutionHtml: "<p>A Mosey adviser reviewed all three, consolidated into a single drawdown-ready plan, and modelled income scenarios for the first ten years of retirement.</p>",
    outcomes: [{ stat: "0.4", suffix: "%", label: "Average annual fee reduction" }, { stat: "1", suffix: "", label: "Single consolidated plan" }],
    testimonialQuote: "We went from three logins and three sets of paperwork to one clear plan we actually understand.",
    testimonialAuthorName: "Margaret Harrington", testimonialAuthorRole: "Customer since 2014",
  },
  {
    slug: "startup-opens-first-account", title: "From spreadsheet to scale-up: a startup's first business account",
    clientName: "Fernleaf Analytics", industry: "business-banking",
    summary: "A two-founder data startup opened its first business account and secured an early working-capital facility within three months.",
    challengeHtml: "<p>The founders had been invoicing clients through a personal account, which made it impossible to show a bank a clean financial history when they needed funding.</p>",
    solutionHtml: "<p>Mosey opened a business account in a single afternoon and, once six months of trading history existed, approved a modest working-capital facility.</p>",
    outcomes: [{ stat: "1", suffix: " day", label: "To open the account" }, { stat: "3", suffix: " mo", label: "To first facility approval" }],
    testimonialQuote: "Having a real business account from month one made every later funding conversation easier.",
    testimonialAuthorName: "Zoe Aldridge", testimonialAuthorRole: "Co-founder, Fernleaf Analytics",
  },
  {
    slug: "family-saves-for-wedding", title: "Saving for a wedding in 14 months without the stress",
    clientName: "The Osei family", industry: "personal-finance",
    summary: "A family used a fixed-rate savings account and a shared budgeting tool to fund a wedding without new debt.",
    challengeHtml: "<p>The couple wanted to avoid a wedding loan but had no clear savings plan and two separate accounts tracking contributions inconsistently.</p>",
    solutionHtml: "<p>Mosey set up a joint savings pot with a fixed rate and automated monthly transfers timed to both salaries.</p>",
    outcomes: [{ stat: "14", suffix: " mo", label: "Time to reach the savings goal" }, { stat: "0", suffix: "", label: "New debt taken on" }],
    testimonialQuote: "Watching the pot grow every month made it feel achievable instead of overwhelming.",
    testimonialAuthorName: "Abena Osei", testimonialAuthorRole: "Customer since 2021",
  },
  {
    slug: "landlord-refinances-portfolio", title: "Refinancing a four-property portfolio in a rising-rate market",
    clientName: "Keane Property Holdings", industry: "investments",
    summary: "A buy-to-let landlord refinanced four properties onto better terms as fixed rates were coming to an end.",
    challengeHtml: "<p>Four mortgages were due to revert to variable rates within six months of each other, all at once pushing monthly costs up sharply.</p>",
    solutionHtml: "<p>Mosey's buy-to-let team staggered the refinancing across three months, locking in new fixed rates before the reversion dates hit.</p>",
    outcomes: [{ stat: "4", suffix: "", label: "Properties refinanced" }, { stat: "0.6", suffix: "%", label: "Average rate saved vs. reversion" }],
    testimonialQuote: "Staggering the refinancing meant we never had all four properties exposed to the variable rate at once.",
    testimonialAuthorName: "Robert Keane", testimonialAuthorRole: "Director, Keane Property Holdings",
  },
  {
    slug: "charity-manages-restricted-funds", title: "Keeping restricted and unrestricted funds separate - without extra admin",
    clientName: "Riverside Community Trust", industry: "business-banking",
    summary: "A local charity used sub-accounts to track restricted grant funding separately from general donations.",
    challengeHtml: "<p>Grant funders required proof that restricted funds weren't mixed with general donations, but the charity had one account and a manual spreadsheet.</p>",
    solutionHtml: "<p>Mosey set up linked sub-accounts under one umbrella, so restricted and unrestricted funds are visible separately without manual reconciliation.</p>",
    outcomes: [{ stat: "100", suffix: "%", label: "Of grant funds separately tracked" }, { stat: "5", suffix: " h", label: "Admin time saved per month" }],
    testimonialQuote: "Our trustees can now see restricted fund balances at a glance - no more end-of-month spreadsheet reconciliation.",
    testimonialAuthorName: "Grace Adeyemi", testimonialAuthorRole: "Treasurer, Riverside Community Trust",
  },
  {
    slug: "freelancer-smooths-income", title: "Smoothing out a freelancer's feast-and-famine income",
    clientName: "Tomasz Nowak, Freelance Designer", industry: "personal-finance",
    summary: "A freelance designer used a tax savings pot and a rolling budget to stop large invoices from vanishing into day-to-day spending.",
    challengeHtml: "<p>Large irregular invoice payments made budgeting difficult, and a tax bill came as a surprise more than once.</p>",
    solutionHtml: "<p>Mosey set up an automatic percentage transfer into a separate tax pot on every incoming invoice, plus a rolling three-month budget view.</p>",
    outcomes: [{ stat: "100", suffix: "%", label: "Of tax bills covered on time since" }, { stat: "3", suffix: " mo", label: "Rolling budget visibility" }],
    testimonialQuote: "The tax pot alone removed the one thing I used to dread every January.",
    testimonialAuthorName: "Tomasz Nowak", testimonialAuthorRole: "Freelance Designer",
  },
  {
    slug: "farm-plans-succession", title: "Planning a three-generation farm handover",
    clientName: "Birchfield Farm", industry: "business-banking",
    summary: "A family farm worked with Mosey's agricultural team to plan a phased handover to the next generation without disrupting cash flow.",
    challengeHtml: "<p>The owners wanted to hand the farm to their children gradually, but existing lending and asset ownership weren't structured for a phased transfer.</p>",
    solutionHtml: "<p>Mosey's agricultural adviser restructured lending around a phased ownership transfer, timed with seasonal income patterns.</p>",
    outcomes: [{ stat: "3", suffix: "", label: "Generations involved in the plan" }, { stat: "5", suffix: " yr", label: "Phased handover timeline" }],
    testimonialQuote: "Having someone who actually understood farm cash flow made the handover plan realistic instead of theoretical.",
    testimonialAuthorName: "William Birchfield", testimonialAuthorRole: "Owner, Birchfield Farm",
  },
  {
    slug: "returner-resets-budget", title: "Resetting a household budget after an 18-month career break",
    clientName: "Chidinma Eze", industry: "personal-finance",
    summary: "A customer returning to work after a career break rebuilt a household budget around a new income and childcare costs.",
    challengeHtml: "<p>Eighteen months out of work had changed the household's spending patterns and introduced new childcare costs that hadn't existed before.</p>",
    solutionHtml: "<p>A Mosey adviser rebuilt the budget from scratch around the new salary and childcare costs, with automatic savings restarting from month one.</p>",
    outcomes: [{ stat: "1", suffix: " mo", label: "To rebuild a working budget" }, { stat: "15", suffix: "%", label: "Of new salary automated into savings" }],
    testimonialQuote: "Going back to work was disorienting enough without also guessing at the budget - having a clear plan helped a lot.",
    testimonialAuthorName: "Chidinma Eze", testimonialAuthorRole: "Customer since 2019",
  },
  {
    slug: "retailer-manages-seasonal-stock", title: "Financing seasonal stock for a Christmas-heavy retailer",
    clientName: "Thistle & Pine Gifts", industry: "business-banking",
    summary: "A gift retailer used a short-term seasonal overdraft to buy Christmas stock months before the revenue arrived.",
    challengeHtml: "<p>Over 60% of annual revenue arrived in November and December, but stock had to be bought and paid for in August and September.</p>",
    solutionHtml: "<p>Mosey structured a seasonal overdraft facility that scaled up ahead of the buying season and wound back down after January.</p>",
    outcomes: [{ stat: "60", suffix: "%", label: "Of annual revenue in Nov-Dec" }, { stat: "0", suffix: "", label: "Missed restock opportunities" }],
    testimonialQuote: "The facility flexes with our actual calendar instead of forcing us into a flat limit all year.",
    testimonialAuthorName: "Hannah Pryce", testimonialAuthorRole: "Owner, Thistle & Pine Gifts",
  },
  {
    slug: "overseas-buyer-manages-currency", title: "Buying a second home abroad without losing money on the transfer",
    clientName: "The Delacroix-Hughes family", industry: "investments",
    summary: "A family buying a holiday home in Portugal used a currency specialist transfer instead of their everyday bank's exchange rate.",
    challengeHtml: "<p>An initial quote from a high-street bank for the property transfer included a wide exchange-rate margin that would have cost thousands extra.</p>",
    solutionHtml: "<p>Mosey's international payments desk booked the transfer at a transparent rate with a fixed, disclosed fee well ahead of completion.</p>",
    outcomes: [{ stat: "4200", suffix: "", label: "GBP saved vs. the original quote" }, { stat: "2", suffix: " d", label: "Transfer completion time" }],
    testimonialQuote: "Nobody had explained the exchange-rate margin to us before - once we saw it clearly, the saving was obvious.",
    testimonialAuthorName: "Sophie Delacroix-Hughes", testimonialAuthorRole: "Customer since 2022",
  },
];

async function seedCaseStudies(): Promise<void> {
  console.log(`\n--- Seeding ${CASE_STUDIES.length} bulk Case Studies ---`);
  const blocksContainer = await ensureSubfolder("editorial");
  let created = 0;
  for (const cs of CASE_STUDIES) {
    const outcomeKeys: string[] = [];
    for (let idx = 0; idx < cs.outcomes.length; idx++) {
      const o = cs.outcomes[idx];
      const key = stableKey("mb-bulk", `outcome:${cs.slug}:${idx}`);
      await createContent(
        {
          key,
          contentType: "OutcomeItemBlock",
          locale: "en",
          container: blocksContainer,
          status: "published",
          displayName: `Outcome - ${cs.title} #${idx + 1}`,
          properties: { stat: o.stat, suffix: o.suffix, label: o.label },
        },
        `Outcome for ${cs.slug}`
      );
      outcomeKeys.push(key);
    }

    const testimonialKey = stableKey("mb-bulk", `testimonial:${cs.slug}`);
    await createContent(
      {
        key: testimonialKey,
        contentType: "TestimonialBlock",
        locale: "en",
        container: blocksContainer,
        status: "published",
        displayName: `Testimonial - ${cs.title}`,
        properties: {
          quote: cs.testimonialQuote,
          authorName: cs.testimonialAuthorName,
          authorRole: cs.testimonialAuthorRole,
        },
      },
      `Testimonial for ${cs.slug}`
    );

    const key = stableKey("mb-bulk", `casestudy:${cs.slug}`);
    const result = await createContent(
      {
        key,
        contentType: "CaseStudyPage",
        locale: "en",
        container: CASE_STUDIES_HUB_KEY,
        status: "published",
        displayName: `Case Study - ${cs.title}`,
        routeSegment: cs.slug,
        properties: {
          title: cs.title,
          clientName: cs.clientName,
          industry: cs.industry,
          summary: cs.summary,
          challenge: { html: cs.challengeHtml },
          solution: { html: cs.solutionHtml },
          outcomes: outcomeKeys.map((k) => `cms://content/${k}`),
          testimonial: `cms://content/${testimonialKey}`,
          tags: [cs.industry],
        },
      },
      cs.title
    );
    if (result) created++;
    await assignCategories(key, `/insights/case-studies/${cs.slug}/`, cs.title);
  }
  console.log(`  [done] ${created} created, ${CASE_STUDIES.length - created} skipped (already existed)`);
}

// --- Blog posts (8) -----------------------------------------------------------

interface BlogDef {
  slug: string;
  heading: string;
  subheading: string;
  publishedDate: string;
}

const BULK_BLOGS: BlogDef[] = [
  { slug: "seasonal-budgeting-made-simple", heading: "Seasonal budgeting made simple", subheading: "Christmas, summer holidays, back-to-school - the costs are predictable, so the budgeting can be too.", publishedDate: "2026-07-03T09:00:00.000Z" },
  { slug: "managing-joint-finances-without-friction", heading: "Managing joint finances without the friction", subheading: "A practical split between shared and personal money that keeps both partners comfortable.", publishedDate: "2026-07-17T09:00:00.000Z" },
  { slug: "staying-safe-with-digital-banking", heading: "Staying safe with digital banking", subheading: "The handful of habits that stop the vast majority of everyday banking scams.", publishedDate: "2026-07-31T09:00:00.000Z" },
  { slug: "the-real-cost-of-subscriptions", heading: "The real cost of subscriptions you forgot about", subheading: "A ten-minute audit most people find saves them more than they expect.", publishedDate: "2026-08-14T09:00:00.000Z" },
  { slug: "building-credit-as-a-student", heading: "Building credit as a student", subheading: "Starting a credit history early and carefully, without taking on debt you don't need.", publishedDate: "2026-08-28T09:00:00.000Z" },
  { slug: "what-to-do-with-a-bonus", heading: "What to do with a work bonus", subheading: "Spend some, save some, and the one mistake worth avoiding entirely.", publishedDate: "2026-09-11T09:00:00.000Z" },
  { slug: "preparing-your-finances-for-parental-leave", heading: "Preparing your finances for parental leave", subheading: "A month-by-month plan for the income gap, before it arrives.", publishedDate: "2026-09-25T09:00:00.000Z" },
  { slug: "when-to-review-your-mortgage", heading: "When to review your mortgage, even mid-term", subheading: "Rate reviews aren't just for renewal time - here's when an early look pays off.", publishedDate: "2026-10-09T09:00:00.000Z" },
];

/**
 * BlogExperience has several isRequired properties (heroImage, author, heading,
 * subheading, publishedDate). patchPublishedPageProperties() creates its draft
 * with only displayName/routeSegment (no properties), which the CMS rejects for
 * a type with required fields - so the generic helper silently fails to produce
 * a draft at all ("Could not find a draft version"). Mirrors seed-blogs.ts's
 * updateBlogVersion: resend the full required property set, plus categories,
 * in the same POST /versions call.
 */
async function assignBlogCategories(key: string, blog: BlogDef, authorKey: string, url: string, label: string): Promise<void> {
  const terms = termsForUrl(url);
  if (terms.length === 0) {
    console.warn(`  [warn] ${label}: no taxonomy rule matched ${url} - left uncategorized`);
    return;
  }
  const token = await getManagementToken();
  const createRes = await fetch(`${CONTENT_ENDPOINT}/${key}/versions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      locale: "en",
      displayName: `Blog - ${blog.heading}`,
      routeSegment: blog.slug,
      properties: {
        heading: { value: blog.heading },
        subheading: { value: blog.subheading },
        publishedDate: { value: blog.publishedDate },
        heroImage: { value: HERO_IMAGE_REF },
        author: { value: { reference: `cms://content/${authorKey}` } },
        categories: { value: terms.map(termUri) },
      },
    }),
  });
  if (!createRes.ok) {
    console.warn(`  [warn] ${label}: create version for categories failed - ${createRes.status} ${(await createRes.text()).slice(0, 200)}`);
    return;
  }
  // The Management API's version list can lag a few hundred ms behind the POST
  // that just created it - retry briefly rather than fail the whole assignment.
  let version: string | undefined;
  for (let attempt = 0; attempt < 5 && !version; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500));
    const vd = (await (
      await fetch(`${CONTENT_ENDPOINT}/${key}/locales/en?pageSize=30`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { items?: Array<{ version?: string; status?: string }> };
    version = (vd.items ?? [])
      .filter((i) => i.status === "draft" && i.version)
      .sort((a, b) => Number(b.version) - Number(a.version))[0]?.version;
  }
  if (!version) {
    console.warn(`  [warn] ${label}: no draft version found after creating one for categories`);
    return;
  }
  const pub = await fetch(`${CONTENT_ENDPOINT}/${key}/versions/${version}:publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pub.ok) console.warn(`  [warn] ${label}: publish after category assignment failed - ${pub.status}`);
}

function blogComposition(blog: BlogDef) {
  const section = gridSection("Section", [
    elementComponent("TextBlock", "Rich Text", {
      body: { html: `<p>${blog.subheading}</p><p>This is a starter rich-text area. Edit it in the Visual Builder, or add more elements and sections around it.</p>` },
    }),
  ]);
  return {
    id: uid(),
    displayName: blog.heading,
    nodeType: "experience",
    layoutType: "outline",
    nodes: [section],
  };
}

async function seedBulkBlogs(): Promise<void> {
  console.log(`\n--- Seeding ${BULK_BLOGS.length} bulk Blog posts ---`);
  let created = 0;
  for (let i = 0; i < BULK_BLOGS.length; i++) {
    const blog = BULK_BLOGS[i];
    const authorKey = AUTHOR_KEYS[i % AUTHOR_KEYS.length];
    const key = stableKey("mb-bulk", `blog:${blog.slug}`);
    const result = await createContent(
      {
        key,
        contentType: "BlogExperience",
        locale: "en",
        container: BLOGS_HUB_KEY,
        displayName: `Blog - ${blog.heading}`,
        routeSegment: blog.slug,
        properties: {
          heading: blog.heading,
          subheading: blog.subheading,
          publishedDate: blog.publishedDate,
          heroImage: HERO_IMAGE_REF,
          author: { reference: `cms://content/${authorKey}` },
        },
        composition: blogComposition(blog),
      },
      blog.heading
    );
    if (result) created++;
    await assignBlogCategories(key, blog, authorKey, `/blogs/${blog.slug}/`, blog.heading);
  }
  console.log(`  [done] ${created} created, ${BULK_BLOGS.length - created} skipped (already existed)`);
}

async function main(): Promise<void> {
  console.log("=== Bulk Content Volume Seeding ===");
  console.log("Checking prerequisites (seed-modeling, seed-consultants, seed-blogs)...");
  await checkPrerequisites();
  console.log("  [ok] all prerequisites found\n");

  await seedArticles();
  await seedConsultants();
  await seedCaseStudies();
  await seedBulkBlogs();

  console.log("\n=== Done ===");
  console.log(`  Articles:    ${ARTICLE_TOPICS.length * ARTICLE_ANGLES.length}`);
  console.log(`  Consultants: ${CONSULTANTS.length}`);
  console.log(`  Case Studies: ${CASE_STUDIES.length}`);
  console.log(`  Blog posts:  ${BULK_BLOGS.length}`);
  console.log("\nWait ~30-60s for Graph to index, then spot-check:");
  console.log(`  /en/insights/articles/${slugify(ARTICLE_TOPICS[0] + ": " + ARTICLE_ANGLES[0].suffix)}/`);
  console.log(`  /en/consultants/${CONSULTANTS[0].routeSegment}/`);
  console.log(`  /en/insights/case-studies/${CASE_STUDIES[0].slug}/`);
  console.log(`  /blogs/${BULK_BLOGS[0].slug}/`);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
