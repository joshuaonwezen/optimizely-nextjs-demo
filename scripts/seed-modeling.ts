/**
 * Content Modeling Demo seed script.
 *
 * Seeds reference content (Authors, Outcomes, Testimonials) and the content
 * modeling demo pages:
 *   - ArticlePage and CaseStudyPage TraditionalPage subtypes (Phase C)
 *   - Additional pages in later phases
 *
 * Builds out content in dependency order — reference targets first, then
 * pages that consume them. Idempotent: each run cleans up previously-seeded
 * items in this script's name-space before recreating.
 *
 * Run: npm run seed:modeling
 * Prerequisites: opti:push (schema), seed (existing pages — homepage exists)
 */

import { config } from "dotenv";
import { randomUUID } from "crypto";
import {
  CONTAINER,
  CONTENT_ENDPOINT,
  createContent,
  deleteContentByKey,
  findItemsInContainerByName,
  noHyphens,
  patchContentProperties,
} from "./_shared";

config({ path: ".env.local" });

// ---------------------------------------------------------------------------
// Pre-allocated keys
// ---------------------------------------------------------------------------

export const AUTHOR_KEYS = {
  evieMarsh:  noHyphens(),
  jordanReid: noHyphens(),
  priyaShah:  noHyphens(),
};

const OUTCOME_KEYS = {
  bakeryRevenue:  noHyphens(),
  bakeryStaff:    noHyphens(),
  bakeryDays:     noHyphens(),
  bakeryNps:      noHyphens(),
  familySaved:    noHyphens(),
  familyDeposit:  noHyphens(),
  familyHours:    noHyphens(),
  familyMonths:   noHyphens(),
};

const TESTIMONIAL_KEYS = {
  bakery: noHyphens(),
  family: noHyphens(),
};

const ARTICLE_KEYS = {
  firstHome:    noHyphens(),
  mortgageRates:noHyphens(),
  businessEss:  noHyphens(),
};

const CASE_STUDY_KEYS = {
  bakery:       noHyphens(),
  familyFinance:noHyphens(),
};

const HUB_KEYS = {
  insights:     noHyphens(), // /en/insights/
  articlesIdx:  noHyphens(), // /en/insights/articles/
  caseStudiesIdx: noHyphens(), // /en/insights/case-studies/
};

// ---------------------------------------------------------------------------
// Idempotent cleanup
// ---------------------------------------------------------------------------
//
// All items seeded by this script use display names beginning with one of the
// sentinel prefixes below, so the cleanup pass can find and delete them
// without touching content from other scripts.

const MODELING_SENTINELS = [
  /^Author — /,
  /^Outcome — /,
  /^Testimonial — Case Study /,
  /^Article — /,
  /^Case Study — /,
  /^Insights Hub$/,
  /^Insights Hub: Articles$/,
  /^Insights Hub: Case Studies$/,
];

async function cleanupPreviousModelingContent(): Promise<void> {
  console.log("--- Cleaning previously seeded modeling content ---");
  const matches = await findItemsInContainerByName(
    (displayName) => MODELING_SENTINELS.some((re) => re.test(displayName))
  );
  for (const item of matches) {
    await deleteContentByKey(item.key);
    console.log(`  [deleted] ${item.displayName}`);
  }
  if (matches.length === 0) console.log("  (nothing to clean)");
}

// ---------------------------------------------------------------------------
// Phase B: Authors
// ---------------------------------------------------------------------------

interface AuthorDef {
  key: string;
  displayName: string;
  name: string;
  role: string;
  bioHtml: string;
  linkedinUrl?: string;
}

const AUTHORS: AuthorDef[] = [
  {
    key: AUTHOR_KEYS.evieMarsh,
    displayName: "Author — Evie Marsh",
    name: "Evie Marsh",
    role: "Head of Mortgages, Mosey Bank",
    bioHtml:
      "<p>Evie has worked in UK mortgage lending for 14 years, including six years advising first-time buyers at Mosey. She writes about the home-buying journey for customers who want plain-English answers.</p>",
    linkedinUrl: "https://www.linkedin.com/in/evie-marsh-mosey/",
  },
  {
    key: AUTHOR_KEYS.jordanReid,
    displayName: "Author — Jordan Reid",
    name: "Jordan Reid",
    role: "Senior Markets Analyst, Mosey Bank",
    bioHtml:
      "<p>Jordan covers interest rates, inflation, and what they mean for everyday savers. Previously at the FCA, where they led work on consumer-friendly investment disclosures.</p>",
    linkedinUrl: "https://www.linkedin.com/in/jordan-reid-mosey/",
  },
  {
    key: AUTHOR_KEYS.priyaShah,
    displayName: "Author — Priya Shah",
    name: "Priya Shah",
    role: "Director of Business Banking, Mosey Bank",
    bioHtml:
      "<p>Priya leads the Mosey small-business banking team. She works directly with founders to understand what banking needs to do — and stop doing — for growing UK businesses.</p>",
    linkedinUrl: "https://www.linkedin.com/in/priya-shah-mosey/",
  },
];

async function seedAuthors(): Promise<void> {
  console.log(`\n--- Seeding ${AUTHORS.length} Authors ---`);
  for (const author of AUTHORS) {
    const payload = {
      key: author.key,
      contentType: "AuthorBlock",
      locale: "en",
      container: CONTAINER,
      status: "published",
      displayName: author.displayName,
      properties: {
        name: author.name,
        role: author.role,
        bio: author.bioHtml,
        ...(author.linkedinUrl ? { linkedinUrl: author.linkedinUrl } : {}),
      },
    };
    const result = await createContent(payload, author.displayName);
    if (result) console.log(`  [created] ${author.displayName}`);
  }
}

// ---------------------------------------------------------------------------
// Phase C — Part 1: Outcome stats (reference targets for case studies)
// ---------------------------------------------------------------------------

interface OutcomeDef {
  key: string;
  displayName: string;
  stat: string;
  suffix: string;
  label: string;
}

const OUTCOMES: OutcomeDef[] = [
  { key: OUTCOME_KEYS.bakeryRevenue, displayName: "Outcome — Bakery revenue uplift",     stat: "38",  suffix: "%",  label: "Revenue growth year-over-year" },
  { key: OUTCOME_KEYS.bakeryStaff,   displayName: "Outcome — Bakery hires",              stat: "11",  suffix: "",   label: "New staff hired" },
  { key: OUTCOME_KEYS.bakeryDays,    displayName: "Outcome — Bakery payment speed",       stat: "2",   suffix: " d", label: "Settlement time (was 7)" },
  { key: OUTCOME_KEYS.bakeryNps,     displayName: "Outcome — Bakery NPS",                stat: "72",  suffix: "",   label: "Net promoter score" },
  { key: OUTCOME_KEYS.familySaved,   displayName: "Outcome — Family savings unlocked",   stat: "12",  suffix: "K",  label: "Saved toward first home" },
  { key: OUTCOME_KEYS.familyDeposit, displayName: "Outcome — Family deposit growth",     stat: "5.1", suffix: "%",  label: "AER on the savings pot" },
  { key: OUTCOME_KEYS.familyHours,   displayName: "Outcome — Family time saved",         stat: "6",   suffix: " h", label: "Per month on admin (was 14)" },
  { key: OUTCOME_KEYS.familyMonths,  displayName: "Outcome — Family timeline",           stat: "18",  suffix: " mo",label: "To reach deposit target" },
];

async function seedOutcomes(): Promise<void> {
  console.log(`\n--- Seeding ${OUTCOMES.length} Outcome stats ---`);
  for (const o of OUTCOMES) {
    const payload = {
      key: o.key,
      contentType: "OutcomeItemBlock",
      locale: "en",
      container: CONTAINER,
      status: "published",
      displayName: o.displayName,
      properties: { stat: o.stat, suffix: o.suffix, label: o.label },
    };
    const result = await createContent(payload, o.displayName);
    if (result) console.log(`  [created] ${o.displayName}`);
  }
}

// ---------------------------------------------------------------------------
// Phase C — Part 2: Testimonials (one per case study)
// ---------------------------------------------------------------------------

interface TestimonialDef {
  key: string;
  displayName: string;
  quote: string;
  authorName: string;
  authorRole: string;
}

const TESTIMONIALS: TestimonialDef[] = [
  {
    key: TESTIMONIAL_KEYS.bakery,
    displayName: "Testimonial — Case Study Bakery",
    quote:
      "Switching to Mosey for our card payments and lending was the single biggest thing we did this year. Next-day settlement freed up cash to hire — we went from 4 to 11 staff.",
    authorName: "Anya Patel",
    authorRole: "Owner, Patel's Pâtisserie",
  },
  {
    key: TESTIMONIAL_KEYS.family,
    displayName: "Testimonial — Case Study Family",
    quote:
      "We thought saving for a deposit was years away. Mosey's fixed-rate account, plus the budgeting tools, helped us get there in 18 months. The advisors actually listened.",
    authorName: "Liam & Saoirse O'Connor",
    authorRole: "First-time buyers, Manchester",
  },
];

async function seedTestimonials(): Promise<void> {
  console.log(`\n--- Seeding ${TESTIMONIALS.length} Testimonials for case studies ---`);
  for (const t of TESTIMONIALS) {
    const payload = {
      key: t.key,
      contentType: "TestimonialBlock",
      locale: "en",
      container: CONTAINER,
      status: "published",
      displayName: t.displayName,
      properties: {
        quote:      t.quote,
        authorName: t.authorName,
        authorRole: t.authorRole,
      },
    };
    const result = await createContent(payload, t.displayName);
    if (result) console.log(`  [created] ${t.displayName}`);
  }
}

// ---------------------------------------------------------------------------
// Phase C — Part 3: Hub pages (provide URL hierarchy)
// ---------------------------------------------------------------------------
//
// The /en/insights/ DynamicExperience is created here as a minimal placeholder
// so its child URLs resolve. Phase E will REPLACE its composition with the
// rich Insights hub.

interface CompNode {
  id: string;
  displayName: string;
  nodeType: string;
  component?: { contentType: string; properties: Record<string, unknown> };
  nodes?: CompNode[];
  layoutType?: string;
}

function uid(): string {
  return randomUUID();
}

function singleSectionHeading(heading: string, subheading: string): CompNode[] {
  return [
    {
      id: uid(),
      displayName: heading,
      nodeType: "section",
      layoutType: "grid",
      component: { contentType: "BlankSection", properties: {} },
      nodes: [
        {
          id: uid(),
          displayName: "Row",
          nodeType: "row",
          nodes: [
            {
              id: uid(),
              displayName: "Column",
              nodeType: "column",
              nodes: [
                {
                  id: uid(),
                  displayName: heading,
                  nodeType: "component",
                  component: {
                    contentType: "SectionHeadingBlock",
                    properties: { heading, subheading },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

async function seedHubPages(): Promise<void> {
  console.log("\n--- Seeding hub pages (Insights URL hierarchy) ---");

  // /en/insights/ — placeholder, enriched in Phase E
  await createContent(
    {
      key: HUB_KEYS.insights,
      contentType: "DynamicExperience",
      locale: "en",
      container: CONTAINER,
      status: "published",
      displayName: "Insights Hub",
      routeSegment: "insights",
      composition: {
        id: uid(),
        displayName: "Composition",
        nodeType: "experience",
        nodes: singleSectionHeading(
          "Insights",
          "Articles, case studies, and market commentary from Mosey Bank."
        ),
      },
    },
    "Insights Hub"
  );
  console.log("  [created] Insights Hub → /en/insights/");

  // /en/insights/articles/
  await createContent(
    {
      key: HUB_KEYS.articlesIdx,
      contentType: "DynamicExperience",
      locale: "en",
      container: HUB_KEYS.insights,
      status: "published",
      displayName: "Insights Hub: Articles",
      routeSegment: "articles",
      composition: {
        id: uid(),
        displayName: "Composition",
        nodeType: "experience",
        nodes: singleSectionHeading(
          "Articles",
          "Plain-English guides on saving, investing, mortgages, and running a business."
        ),
      },
    },
    "Insights Hub: Articles"
  );
  console.log("  [created] Insights Hub: Articles → /en/insights/articles/");

  // /en/insights/case-studies/
  await createContent(
    {
      key: HUB_KEYS.caseStudiesIdx,
      contentType: "DynamicExperience",
      locale: "en",
      container: HUB_KEYS.insights,
      status: "published",
      displayName: "Insights Hub: Case Studies",
      routeSegment: "case-studies",
      composition: {
        id: uid(),
        displayName: "Composition",
        nodeType: "experience",
        nodes: singleSectionHeading(
          "Case Studies",
          "How Mosey customers — families and small businesses — moved forward with us."
        ),
      },
    },
    "Insights Hub: Case Studies"
  );
  console.log("  [created] Insights Hub: Case Studies → /en/insights/case-studies/");
}

// ---------------------------------------------------------------------------
// Phase C — Part 4: Articles (TraditionalPage subtype)
// ---------------------------------------------------------------------------

interface ArticleDef {
  key: string;
  routeSegment: string;
  displayName: string;     // sentinel-prefixed display name
  title: string;
  summary: string;
  bodyHtml: string;
  authorKey: string;
  publishDate: string;     // ISO 8601
  category: string;        // must match enum value in optimizely.config.mjs
  tags: string[];
  relatedKeys: string[];   // keys of other articles
}

const ARTICLES: ArticleDef[] = [
  {
    key: ARTICLE_KEYS.firstHome,
    routeSegment: "saving-for-first-home",
    displayName: "Article — Saving for your first home",
    title: "Saving for your first home: a 5-step plan that actually works",
    summary:
      "Buying your first home feels impossible until it isn't. Here's the saving-and-application sequence we walk first-time buyers through every week.",
    bodyHtml: [
      "<p>Most first-time buyers we speak to think they're three to five years off owning. In reality, with a clear plan and a competitive savings rate, 18 months is realistic for many.</p>",
      "<h2>1. Know your deposit number</h2>",
      "<p>Lenders need 5–10% of the purchase price as a minimum deposit. On a £225,000 home, that's £11,250 at 5%. Pick the number you actually need before you start saving.</p>",
      "<h2>2. Pick the right account, not the popular one</h2>",
      "<p>A Lifetime ISA gives you a 25% government bonus on up to £4,000 a year — that's £1,000 free. Pair it with a high-rate easy-access account for the rest.</p>",
      "<h2>3. Automate the boring part</h2>",
      "<p>Set up a standing order the day after payday. Treat it as a bill you pay yourself. People who automate save 32% more than people who 'save what's left'.</p>",
      "<h2>4. Get a decision in principle early</h2>",
      "<p>A DIP takes 10 minutes online and won't affect your credit score. Knowing your borrowing ceiling stops you wasting time on properties out of reach.</p>",
      "<h2>5. Make the offer with confidence</h2>",
      "<p>Sellers prefer buyers with finance lined up. A Mosey DIP letter often tips a competing offer in your favour, even when you aren't the highest bidder.</p>",
    ].join(""),
    authorKey: AUTHOR_KEYS.evieMarsh,
    publishDate: "2026-04-12T09:00:00.000Z",
    category: "personal-finance",
    tags: ["mortgage", "savings", "first-time-buyer"],
    relatedKeys: [ARTICLE_KEYS.mortgageRates],
  },
  {
    key: ARTICLE_KEYS.mortgageRates,
    routeSegment: "mortgage-rates-explained",
    displayName: "Article — Mortgage rates explained",
    title: "Mortgage rates in 2026: what's actually moving them",
    summary:
      "Headline rates make great news. They make terrible decision-making tools. Here's what to watch instead.",
    bodyHtml: [
      "<p>The Bank of England base rate gets most of the headlines, but it's only one of four things moving the rate you'll actually pay.</p>",
      "<h2>The four levers</h2>",
      "<p>Swap rates, lender competition, your loan-to-value, and your credit history all play a bigger role than people realise. The base rate is the floor — your personal rate is the floor plus a stack of risk premiums.</p>",
      "<h2>What's happened in 2026</h2>",
      "<p>Swap rates eased in Q1 as inflation data came in below expectations. That feeds through to 2- and 5-year fixed offers within weeks, not months. We've seen lenders cut fixed rates four times this year.</p>",
      "<h2>Should you fix?</h2>",
      "<p>If you value certainty and your monthly budget is tight, yes. A 2-year fix gives you headroom to remortgage when conditions ease without locking you in too long.</p>",
    ].join(""),
    authorKey: AUTHOR_KEYS.jordanReid,
    publishDate: "2026-05-02T08:00:00.000Z",
    category: "market-insights",
    tags: ["mortgage", "rates", "investing"],
    relatedKeys: [ARTICLE_KEYS.firstHome],
  },
  {
    key: ARTICLE_KEYS.businessEss,
    routeSegment: "business-banking-essentials",
    displayName: "Article — Business banking essentials",
    title: "Business banking essentials for founders in year one",
    summary:
      "Five banking decisions that quietly determine whether your first year is calm or chaotic. Most founders only realise they got them wrong at month nine.",
    bodyHtml: [
      "<p>You'll worry about product-market fit, hiring, and your tax bill. Banking should not be on the list of things keeping you up. Here's how to make sure it isn't.</p>",
      "<h2>1. Separate accounts from day one</h2>",
      "<p>Mixing personal and business money is the most common, most expensive mistake we see. Even sole traders should split — it makes Self Assessment painless.</p>",
      "<h2>2. Pick a card processor before you need one</h2>",
      "<p>If you'll accept payments, lock in a processor with next-day settlement before launch. Waiting 7 days for funds tanks early-stage cash flow.</p>",
      "<h2>3. Set up bookkeeping integrations once</h2>",
      "<p>Connect Xero or QuickBooks to your business current account on opening day. Backfilling six months of transactions later costs an accountant £400 — automating up front costs you nothing.</p>",
      "<h2>4. Build a lending relationship early</h2>",
      "<p>Apply for a small overdraft facility while you don't need it. When you do, the relationship is already in place.</p>",
      "<h2>5. Calendar a banking review</h2>",
      "<p>Twice a year, look at fees, FX charges, and rates. Your needs at month 18 are not your needs at month 1.</p>",
    ].join(""),
    authorKey: AUTHOR_KEYS.priyaShah,
    publishDate: "2026-03-21T07:30:00.000Z",
    category: "business-banking",
    tags: ["startups", "cashflow", "tax"],
    relatedKeys: [ARTICLE_KEYS.mortgageRates, ARTICLE_KEYS.firstHome],
  },
];

async function seedArticles(): Promise<void> {
  console.log(`\n--- Seeding ${ARTICLES.length} Articles (pass 1: create without cross-refs) ---`);
  for (const a of ARTICLES) {
    const payload = {
      key: a.key,
      contentType: "ArticlePage",
      locale: "en",
      container: HUB_KEYS.articlesIdx,
      status: "published",
      displayName: a.displayName,
      routeSegment: a.routeSegment,
      properties: {
        title:       a.title,
        summary:     a.summary,
        body:        a.bodyHtml,
        author:      `cms://content/${a.authorKey}`,
        publishDate: a.publishDate,
        category:    a.category,
        tags:        a.tags,
        // relatedArticles wired up in pass 2 once all articles exist
      },
    };
    const result = await createContent(payload, a.displayName);
    if (result) console.log(`  [created] ${a.displayName} → /en/insights/articles/${a.routeSegment}/`);
  }

  console.log(`--- Articles pass 2: wiring relatedArticles cross-references ---`);
  for (const a of ARTICLES) {
    if (a.relatedKeys.length === 0) continue;
    await patchContentProperties(a.key, {
      relatedArticles: a.relatedKeys.map((k) => `cms://content/${k}`),
    });
    console.log(`  [patched] ${a.displayName} → ${a.relatedKeys.length} related article(s)`);
  }
}

// ---------------------------------------------------------------------------
// Phase C — Part 5: Case Studies
// ---------------------------------------------------------------------------

interface CaseStudyDef {
  key: string;
  routeSegment: string;
  displayName: string;
  title: string;
  clientName: string;
  industry: string;
  summary: string;
  challengeHtml: string;
  solutionHtml: string;
  outcomeKeys: string[];
  testimonialKey: string;
  tags: string[];
  relatedKeys: string[];
}

const CASE_STUDIES: CaseStudyDef[] = [
  {
    key: CASE_STUDY_KEYS.bakery,
    routeSegment: "local-bakery-growth",
    displayName: "Case Study — Local bakery growth",
    title: "How a Manchester pâtisserie tripled revenue in 18 months",
    clientName: "Patel's Pâtisserie",
    industry: "business-banking",
    summary:
      "A six-year-old high-street bakery moved its banking, payments, and lending to Mosey and used the unlocked cash flow to hire seven new staff.",
    challengeHtml:
      "<p>Anya Patel's bakery had outgrown its old bank. Card payments settled after 7 days — meaning a Saturday lunch rush sat in suspense until the following Friday. Two failed lending applications had left her cautious about expansion.</p>",
    solutionHtml:
      "<p>The Mosey Business team consolidated her current account, card terminal, and a flexible overdraft. Next-day settlement freed up an average of £18,000 in working capital. A small business loan, structured around seasonal cash flow, funded a refit and the first three hires.</p>",
    outcomeKeys: [
      OUTCOME_KEYS.bakeryRevenue,
      OUTCOME_KEYS.bakeryStaff,
      OUTCOME_KEYS.bakeryDays,
      OUTCOME_KEYS.bakeryNps,
    ],
    testimonialKey: TESTIMONIAL_KEYS.bakery,
    tags: ["startups", "cashflow"],
    relatedKeys: [CASE_STUDY_KEYS.familyFinance],
  },
  {
    key: CASE_STUDY_KEYS.familyFinance,
    routeSegment: "family-finance-journey",
    displayName: "Case Study — Family finance journey",
    title: "From renters to homeowners: a Manchester family's 18-month plan",
    clientName: "The O'Connor family",
    industry: "personal-finance",
    summary:
      "Liam and Saoirse used Mosey's fixed-rate savings account and budgeting tools to reach their first-home deposit in less than half the time they expected.",
    challengeHtml:
      "<p>The O'Connors had been saving in their current account for two years and felt no closer to a deposit. They couldn't see where money was going, didn't know which savings products to choose, and were intimidated by mortgage paperwork.</p>",
    solutionHtml:
      "<p>Their Mosey advisor mapped a 18-month plan: split spending into a tracked budget, move existing savings to the 5.1% AER fixed-rate account, and time a Lifetime ISA contribution to maximise the government bonus. We checked in quarterly.</p>",
    outcomeKeys: [
      OUTCOME_KEYS.familySaved,
      OUTCOME_KEYS.familyDeposit,
      OUTCOME_KEYS.familyHours,
      OUTCOME_KEYS.familyMonths,
    ],
    testimonialKey: TESTIMONIAL_KEYS.family,
    tags: ["mortgage", "savings", "family"],
    relatedKeys: [CASE_STUDY_KEYS.bakery],
  },
];

async function seedCaseStudies(): Promise<void> {
  console.log(`\n--- Seeding ${CASE_STUDIES.length} Case Studies (pass 1: create without cross-refs) ---`);
  for (const cs of CASE_STUDIES) {
    const payload = {
      key: cs.key,
      contentType: "CaseStudyPage",
      locale: "en",
      container: HUB_KEYS.caseStudiesIdx,
      status: "published",
      displayName: cs.displayName,
      routeSegment: cs.routeSegment,
      properties: {
        title:       cs.title,
        clientName:  cs.clientName,
        industry:    cs.industry,
        summary:     cs.summary,
        challenge:   cs.challengeHtml,
        solution:    cs.solutionHtml,
        outcomes:    cs.outcomeKeys.map((k) => `cms://content/${k}`),
        testimonial: `cms://content/${cs.testimonialKey}`,
        tags:        cs.tags,
        // relatedCaseStudies wired in pass 2
      },
    };
    const result = await createContent(payload, cs.displayName);
    if (result) console.log(`  [created] ${cs.displayName} → /en/insights/case-studies/${cs.routeSegment}/`);
  }

  console.log(`--- Case Studies pass 2: wiring relatedCaseStudies cross-references ---`);
  for (const cs of CASE_STUDIES) {
    if (cs.relatedKeys.length === 0) continue;
    await patchContentProperties(cs.key, {
      relatedCaseStudies: cs.relatedKeys.map((k) => `cms://content/${k}`),
    });
    console.log(`  [patched] ${cs.displayName} → ${cs.relatedKeys.length} related case study(ies)`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Content Modeling Demo Seeding ===\n");

  await cleanupPreviousModelingContent();

  // Pause to let CMS release routeSegments from deleted pages.
  await new Promise((r) => setTimeout(r, 4000));

  // Reference targets first (depended on by articles and case studies).
  await seedAuthors();
  await seedOutcomes();
  await seedTestimonials();

  // Hub pages must exist before child articles/case studies are created
  // so the URL hierarchy resolves.
  await seedHubPages();

  // Pages that consume the reference targets.
  await seedArticles();
  await seedCaseStudies();

  console.log("\n=== Phase C complete ===");
  console.log("  Authors:        " + AUTHORS.length);
  console.log("  Outcomes:       " + OUTCOMES.length);
  console.log("  Testimonials:   " + TESTIMONIALS.length);
  console.log("  Hub pages:      3");
  console.log("  Articles:       " + ARTICLES.length);
  console.log("  Case Studies:   " + CASE_STUDIES.length);
  console.log("\nWait ~30s for Graph to index, then visit:");
  console.log("  /en/insights/articles/saving-for-first-home/");
  console.log("  /en/insights/case-studies/local-bakery-growth/");
  console.log("\nUpcoming phases (not yet seeded):");
  console.log("  D  Pricing, Team, Timeline, Compare Accounts");
  console.log("  E  Insights hub with filtering");
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});

export { CONTAINER, CONTENT_ENDPOINT };
